CREATE TABLE public.bank_statement_match_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_transaction_id uuid NOT NULL REFERENCES public.bank_statement_transactions(id) ON DELETE CASCADE,
  journal_line_id uuid NOT NULL UNIQUE REFERENCES public.journal_lines(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bank_statement_match_lines_txn_idx ON public.bank_statement_match_lines(bank_transaction_id);
CREATE INDEX bank_statement_match_lines_entry_idx ON public.bank_statement_match_lines(entry_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statement_match_lines TO authenticated;
GRANT ALL ON public.bank_statement_match_lines TO service_role;

ALTER TABLE public.bank_statement_match_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_match_lines_select ON public.bank_statement_match_lines FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role)
  OR is_current_officer(auth.uid(), 'treasurer') OR is_current_officer(auth.uid(), 'auditor_1')
  OR is_current_officer(auth.uid(), 'auditor_2') OR is_current_officer(auth.uid(), 'worshipful_master'));
CREATE POLICY bank_match_lines_insert ON public.bank_statement_match_lines FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));
CREATE POLICY bank_match_lines_update ON public.bank_statement_match_lines FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));
CREATE POLICY bank_match_lines_delete ON public.bank_statement_match_lines FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

-- Atomic split match: first line becomes the primary link, the rest go to the link table.
CREATE OR REPLACE FUNCTION public.link_bank_row_to_lines(p_bank_txn_id uuid, p_line_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row record;
  v_bank uuid;
  v_ids uuid[];
  v_count int;
  v_sum bigint;
  v_bad int;
  v_first uuid;
  v_first_entry uuid;
  v_all uuid[];
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer')) THEN
    RAISE EXCEPTION 'Only the Treasurer or an administrator can match bank lines.';
  END IF;
  IF p_line_ids IS NULL OR array_length(p_line_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Choose at least one ledger line.';
  END IF;
  SELECT array_agg(DISTINCT x) INTO v_ids FROM unnest(p_line_ids) x;
  IF array_length(v_ids, 1) <> array_length(p_line_ids, 1) THEN
    RAISE EXCEPTION 'The same ledger line was chosen twice.';
  END IF;

  SELECT * INTO v_row FROM bank_statement_transactions WHERE id = p_bank_txn_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bank statement line not found.'; END IF;
  IF v_row.amount_pence = 0 THEN RAISE EXCEPTION 'This bank line has a zero amount.'; END IF;

  SELECT id INTO v_bank FROM chart_of_accounts WHERE code = '1000' LIMIT 1;

  SELECT count(*) INTO v_count FROM journal_lines WHERE id = ANY(v_ids);
  IF v_count <> array_length(v_ids, 1) THEN RAISE EXCEPTION 'One or more ledger lines no longer exist.'; END IF;

  SELECT count(*) INTO v_bad FROM journal_lines WHERE id = ANY(v_ids) AND account_id IS DISTINCT FROM v_bank;
  IF v_bad > 0 THEN RAISE EXCEPTION 'Every ledger line must be on account 1000 Bank.'; END IF;

  IF v_row.amount_pence > 0 THEN
    SELECT count(*) INTO v_bad FROM journal_lines WHERE id = ANY(v_ids) AND NOT (debit_pence > 0 AND coalesce(credit_pence,0) = 0);
    IF v_bad > 0 THEN RAISE EXCEPTION 'Money into the bank must be matched to debit lines on 1000 Bank.'; END IF;
    SELECT sum(debit_pence) INTO v_sum FROM journal_lines WHERE id = ANY(v_ids);
  ELSE
    SELECT count(*) INTO v_bad FROM journal_lines WHERE id = ANY(v_ids) AND NOT (credit_pence > 0 AND coalesce(debit_pence,0) = 0);
    IF v_bad > 0 THEN RAISE EXCEPTION 'Money out of the bank must be matched to credit lines on 1000 Bank.'; END IF;
    SELECT sum(credit_pence) INTO v_sum FROM journal_lines WHERE id = ANY(v_ids);
  END IF;

  -- Lines already taken by another bank row (primary or split link).
  SELECT count(*) INTO v_bad FROM bank_statement_transactions
    WHERE matched_journal_line_id = ANY(v_ids) AND id <> p_bank_txn_id;
  IF v_bad = 0 THEN
    SELECT count(*) INTO v_bad FROM bank_statement_match_lines
      WHERE journal_line_id = ANY(v_ids) AND bank_transaction_id <> p_bank_txn_id;
  END IF;
  IF v_bad > 0 THEN RAISE EXCEPTION 'One or more ledger lines are already matched to another bank line.'; END IF;

  -- Extending an existing match: the new set must include the lines already linked.
  v_all := v_ids;
  IF v_row.matched_journal_line_id IS NOT NULL AND NOT (v_row.matched_journal_line_id = ANY(v_ids)) THEN
    RAISE EXCEPTION 'This bank line is already matched to another ledger line. Include that line, or unmatch it first.';
  END IF;
  IF v_row.matched_journal_line_id IS NULL AND v_row.matched_entry_id IS NOT NULL THEN
    RAISE EXCEPTION 'This bank line has an older entry-level match. Unmatch it first.';
  END IF;
  SELECT count(*) INTO v_bad FROM bank_statement_match_lines
    WHERE bank_transaction_id = p_bank_txn_id AND NOT (journal_line_id = ANY(v_ids));
  IF v_bad > 0 THEN RAISE EXCEPTION 'Include every ledger line already linked to this bank line, or unmatch it first.'; END IF;

  IF v_sum <> abs(v_row.amount_pence) THEN
    RAISE EXCEPTION 'The chosen lines total £% but the bank line is £% — they must be equal.',
      to_char(v_sum / 100.0, 'FM999999990.00'), to_char(abs(v_row.amount_pence) / 100.0, 'FM999999990.00');
  END IF;

  v_first := coalesce(v_row.matched_journal_line_id, p_line_ids[1]);
  SELECT entry_id INTO v_first_entry FROM journal_lines WHERE id = v_first;

  UPDATE bank_statement_transactions
     SET matched_journal_line_id = v_first, matched_entry_id = v_first_entry,
         match_type = 'manual', matched_at = now(), match_rejected = false
   WHERE id = p_bank_txn_id;

  DELETE FROM bank_statement_match_lines WHERE bank_transaction_id = p_bank_txn_id;
  INSERT INTO bank_statement_match_lines (bank_transaction_id, journal_line_id, entry_id, created_by)
  SELECT p_bank_txn_id, jl.id, jl.entry_id, auth.uid()
    FROM journal_lines jl WHERE jl.id = ANY(v_ids) AND jl.id <> v_first;
END $$;

CREATE OR REPLACE FUNCTION public.unlink_bank_row(p_bank_txn_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer')) THEN
    RAISE EXCEPTION 'Only the Treasurer or an administrator can unmatch bank lines.';
  END IF;
  DELETE FROM bank_statement_match_lines WHERE bank_transaction_id = p_bank_txn_id;
  UPDATE bank_statement_transactions
     SET matched_journal_line_id = NULL, matched_entry_id = NULL, match_type = NULL, matched_at = NULL
   WHERE id = p_bank_txn_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bank statement line not found.'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.link_bank_row_to_lines(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unlink_bank_row(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_bank_row_to_lines(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_bank_row(uuid) TO authenticated;