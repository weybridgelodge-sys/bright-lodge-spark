ALTER TABLE public.bank_statement_transactions
  ADD COLUMN IF NOT EXISTS matched_journal_line_id uuid,
  ADD COLUMN IF NOT EXISTS matched_entry_id uuid,
  ADD COLUMN IF NOT EXISTS match_type text,
  ADD COLUMN IF NOT EXISTS matched_at timestamptz,
  ADD COLUMN IF NOT EXISTS match_rejected boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS bank_statement_tx_match_idx
  ON public.bank_statement_transactions (statement_id, matched_journal_line_id);

-- Tighten SELECT: match the parent bank_statements role checks exactly.
DROP POLICY IF EXISTS bank_statement_tx_select ON public.bank_statement_transactions;
CREATE POLICY bank_statement_tx_select ON public.bank_statement_transactions
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'secretary'::app_role)
    OR is_current_officer(auth.uid(), 'treasurer'::text)
    OR is_current_officer(auth.uid(), 'auditor_1'::text)
    OR is_current_officer(auth.uid(), 'auditor_2'::text)
    OR is_current_officer(auth.uid(), 'worshipful_master'::text)
  );

DROP POLICY IF EXISTS bank_statement_tx_update ON public.bank_statement_transactions;
CREATE POLICY bank_statement_tx_update ON public.bank_statement_transactions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statement_transactions TO authenticated;
GRANT ALL ON public.bank_statement_transactions TO service_role;