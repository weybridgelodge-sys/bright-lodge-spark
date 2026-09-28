CREATE TABLE public.treasurer_year_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  masonic_year integer NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','query','approved')),
  round_number integer NOT NULL DEFAULT 0,
  figures_snapshot jsonb,
  submitted_at timestamptz,
  submitted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.treasurer_year_approval_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id uuid NOT NULL REFERENCES public.treasurer_year_approvals(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  figures_snapshot jsonb NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  submitted_by uuid,
  outcome text CHECK (outcome IN ('query','approved')),
  UNIQUE (approval_id, round_number)
);
CREATE TABLE public.treasurer_year_signoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id uuid NOT NULL REFERENCES public.treasurer_year_approvals(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  officer_role text NOT NULL CHECK (officer_role IN ('auditor_1','auditor_2')),
  signed_by uuid NOT NULL DEFAULT auth.uid(),
  signed_at timestamptz NOT NULL DEFAULT now(),
  decision text NOT NULL CHECK (decision IN ('confirmed','query')),
  note text,
  CHECK (decision <> 'query' OR length(btrim(coalesce(note,''))) > 0),
  UNIQUE (approval_id, round_number, officer_role)
);

GRANT SELECT ON public.treasurer_year_approvals TO authenticated;
GRANT SELECT ON public.treasurer_year_approval_rounds TO authenticated;
GRANT SELECT, INSERT ON public.treasurer_year_signoffs TO authenticated;
GRANT ALL ON public.treasurer_year_approvals, public.treasurer_year_approval_rounds, public.treasurer_year_signoffs TO service_role;

ALTER TABLE public.treasurer_year_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasurer_year_approval_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasurer_year_signoffs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_year_audit(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user,'admin'::public.app_role)
    OR public.is_current_officer(_user,'treasurer')
    OR public.is_current_officer(_user,'auditor_1')
    OR public.is_current_officer(_user,'auditor_2')
    OR public.is_current_officer(_user,'secretary')
    OR public.is_current_officer(_user,'worshipful_master')
$$;

CREATE POLICY "Year audit readers" ON public.treasurer_year_approvals FOR SELECT TO authenticated USING (public.can_view_year_audit(auth.uid()));
CREATE POLICY "Year audit readers" ON public.treasurer_year_approval_rounds FOR SELECT TO authenticated USING (public.can_view_year_audit(auth.uid()));
CREATE POLICY "Year audit readers" ON public.treasurer_year_signoffs FOR SELECT TO authenticated USING (public.can_view_year_audit(auth.uid()));
CREATE POLICY "Current auditor signs current round" ON public.treasurer_year_signoffs FOR INSERT TO authenticated
WITH CHECK (
  signed_by = auth.uid()
  AND public.is_current_officer(auth.uid(), officer_role)
  AND EXISTS (SELECT 1 FROM public.treasurer_year_approvals a
              WHERE a.id = approval_id AND a.status = 'submitted' AND a.round_number = treasurer_year_signoffs.round_number)
);
-- No UPDATE/DELETE policies: sign-offs are immutable; approval rows change only via RPC/trigger.

CREATE TRIGGER treasurer_year_approvals_updated_at BEFORE UPDATE ON public.treasurer_year_approvals
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Server-side snapshot of the year's figures (never trusted from the client).
CREATE OR REPLACE FUNCTION public.year_audit_snapshot(_year integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start date := make_date(_year,10,1);
  v_end date := make_date(_year+1,9,30);
  v_accounts jsonb;
  v_income bigint; v_expense bigint; v_assets bigint; v_liab bigint; v_equity bigint; v_prior bigint;
  v_dr bigint; v_cr bigint;
BEGIN
  WITH l AS (
    SELECT a.id, a.code, a.name, a.account_type AS t, e.entry_date d,
           (l.debit_pence - l.credit_pence)::bigint net,
           COALESCE(p.period_type,'month') = 'closing' AS closing
    FROM public.journal_lines l
    JOIN public.journal_entries e ON e.id = l.entry_id
    JOIN public.chart_of_accounts a ON a.id = l.account_id
    LEFT JOIN public.treasurer_periods p ON p.id = e.period_id
    WHERE e.entry_date <= v_end
  ), acc AS (
    SELECT code, name, t,
      SUM(CASE WHEN t IN ('income','expense') THEN (CASE WHEN d >= v_start AND NOT closing THEN net ELSE 0 END) ELSE net END)::bigint AS net
    FROM l GROUP BY code, name, t
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object('code',code,'name',name,'type',t,'net',net) ORDER BY code) FILTER (WHERE net <> 0), '[]'::jsonb),
    COALESCE(SUM(-net) FILTER (WHERE t='income'),0), COALESCE(SUM(net) FILTER (WHERE t='expense'),0),
    COALESCE(SUM(net) FILTER (WHERE t='asset'),0), COALESCE(SUM(-net) FILTER (WHERE t='liability'),0),
    COALESCE(SUM(-net) FILTER (WHERE t='equity'),0),
    COALESCE(SUM(GREATEST(net,0)),0), COALESCE(SUM(GREATEST(-net,0)),0)
  INTO v_accounts, v_income, v_expense, v_assets, v_liab, v_equity, v_dr, v_cr FROM acc;

  SELECT COALESCE(SUM(l.credit_pence - l.debit_pence),0)::bigint INTO v_prior
  FROM public.journal_lines l JOIN public.journal_entries e ON e.id = l.entry_id
  JOIN public.chart_of_accounts a ON a.id = l.account_id
  WHERE a.account_type IN ('income','expense') AND e.entry_date < v_start;

  RETURN jsonb_build_object(
    'masonic_year', _year, 'as_at', v_end, 'taken_at', now(),
    'income_expenditure', jsonb_build_object('income', v_income, 'expenditure', v_expense, 'surplus', v_income - v_expense),
    'balance_sheet', jsonb_build_object('assets', v_assets, 'liabilities', v_liab, 'net_assets', v_assets - v_liab,
       'fund_bf', v_equity + v_prior, 'surplus', v_income - v_expense, 'total_funds', v_equity + v_prior + v_income - v_expense),
    'trial_balance', jsonb_build_object('debit', v_dr + GREATEST(-v_prior,0), 'credit', v_cr + GREATEST(v_prior,0)),
    'accounts', v_accounts
  );
END $$;
REVOKE ALL ON FUNCTION public.year_audit_snapshot(integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_year_for_audit(_year integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_status text; v_round integer; v_snap jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::public.app_role) OR public.is_current_officer(auth.uid(),'treasurer')) THEN
    RAISE EXCEPTION 'Only the Treasurer can submit the accounts for audit review';
  END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries e JOIN public.treasurer_periods p ON p.id = e.period_id
             WHERE p.period_type='closing' AND p.masonic_year=_year AND e.source_type='year_close') THEN
    RAISE EXCEPTION 'FY %/% is already closed', _year, _year+1;
  END IF;
  INSERT INTO public.treasurer_year_approvals (masonic_year) VALUES (_year) ON CONFLICT (masonic_year) DO NOTHING;
  SELECT id, status, round_number INTO v_id, v_status, v_round FROM public.treasurer_year_approvals WHERE masonic_year=_year FOR UPDATE;
  IF v_status NOT IN ('draft','query') THEN
    RAISE EXCEPTION 'FY %/% is already % — it can only be (re)submitted from Draft or Query raised', _year, _year+1, v_status;
  END IF;
  v_snap := public.year_audit_snapshot(_year);
  v_round := v_round + 1;
  INSERT INTO public.treasurer_year_approval_rounds (approval_id, round_number, figures_snapshot, submitted_by)
    VALUES (v_id, v_round, v_snap, auth.uid());
  UPDATE public.treasurer_year_approvals SET status='submitted', round_number=v_round, figures_snapshot=v_snap,
    submitted_at=now(), submitted_by=auth.uid() WHERE id=v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_year_for_audit(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_year_for_audit(integer) TO authenticated;

-- State machine: any query -> 'query' at once; both auditors confirmed -> 'approved'.
CREATE OR REPLACE FUNCTION public.tg_year_signoff_apply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_confirmed integer;
BEGIN
  PERFORM 1 FROM public.treasurer_year_approvals WHERE id = NEW.approval_id
    AND status='submitted' AND round_number = NEW.round_number FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This review round is no longer awaiting sign-off'; END IF;
  IF NEW.decision = 'query' THEN
    UPDATE public.treasurer_year_approvals SET status='query' WHERE id=NEW.approval_id;
    UPDATE public.treasurer_year_approval_rounds SET outcome='query' WHERE approval_id=NEW.approval_id AND round_number=NEW.round_number;
  ELSE
    SELECT count(DISTINCT officer_role) INTO v_confirmed FROM public.treasurer_year_signoffs
      WHERE approval_id=NEW.approval_id AND round_number=NEW.round_number AND decision='confirmed';
    IF v_confirmed >= 2 THEN
      UPDATE public.treasurer_year_approvals SET status='approved' WHERE id=NEW.approval_id;
      UPDATE public.treasurer_year_approval_rounds SET outcome='approved' WHERE approval_id=NEW.approval_id AND round_number=NEW.round_number;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER treasurer_year_signoffs_apply AFTER INSERT ON public.treasurer_year_signoffs
FOR EACH ROW EXECUTE FUNCTION public.tg_year_signoff_apply();

CREATE OR REPLACE FUNCTION public.get_my_pending_year_reviews()
RETURNS TABLE(approval_id uuid, masonic_year integer, round_number integer, officer_role text, submitted_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.masonic_year, a.round_number, r.role, a.submitted_at
  FROM public.treasurer_year_approvals a
  CROSS JOIN (VALUES ('auditor_1'),('auditor_2')) r(role)
  WHERE a.status='submitted' AND public.is_current_officer(auth.uid(), r.role)
    AND NOT EXISTS (SELECT 1 FROM public.treasurer_year_signoffs s
      WHERE s.approval_id=a.id AND s.round_number=a.round_number AND s.officer_role=r.role)
  ORDER BY a.masonic_year, r.role
$$;
REVOKE ALL ON FUNCTION public.get_my_pending_year_reviews() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_pending_year_reviews() TO authenticated;

CREATE OR REPLACE FUNCTION public.post_year_close(_year integer, _expected_net bigint)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start date := make_date(_year, 10, 1);
  v_end date := make_date(_year + 1, 9, 30);
  v_period uuid;
  v_status text;
  v_entry uuid;
  v_fund uuid;
  v_net bigint := 0;
  v_count integer := 0;
  r record;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::public.app_role)
          OR public.is_current_officer(auth.uid(),'treasurer')) THEN
    RAISE EXCEPTION 'Only the Treasurer can post the closing journal';
  END IF;
  IF (now() AT TIME ZONE 'Europe/London')::date <= v_end THEN
    RAISE EXCEPTION 'FY %/% has not ended yet (ends %)', _year, _year + 1, v_end;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.treasurer_year_approvals WHERE masonic_year = _year AND status = 'approved') THEN
    RAISE EXCEPTION 'FY %/% cannot be closed until both auditors have approved the accounts', _year, _year + 1;
  END IF;
  SELECT id INTO v_fund FROM public.chart_of_accounts WHERE code = '3000';
  IF v_fund IS NULL THEN RAISE EXCEPTION 'Account 3000 General Fund not found'; END IF;

  SELECT id, status INTO v_period, v_status FROM public.treasurer_periods
    WHERE period_type = 'closing' AND masonic_year = _year FOR UPDATE;
  IF v_period IS NULL THEN
    INSERT INTO public.treasurer_periods (label, period_type, masonic_year)
    VALUES (format('FY %s/%s Year-End Close', _year, right((_year + 1)::text, 2)), 'closing', _year)
    RETURNING id, status INTO v_period, v_status;
  END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE period_id = v_period AND source_type = 'year_close') THEN
    RAISE EXCEPTION 'FY %/% is already closed — a closing journal already exists', _year, _year + 1;
  END IF;
  IF v_status = 'locked' THEN
    RAISE EXCEPTION 'The FY %/% closing period is locked', _year, _year + 1;
  END IF;

  INSERT INTO public.journal_entries (entry_date, description, source_type, period_id, created_by)
  VALUES (v_end + 1, format('Year-end closing journal FY %s/%s', _year, _year + 1), 'year_close', v_period, auth.uid())
  RETURNING id INTO v_entry;

  FOR r IN
    SELECT a.id, a.code, a.name, SUM(l.debit_pence - l.credit_pence)::bigint AS net
    FROM public.journal_lines l
    JOIN public.journal_entries e ON e.id = l.entry_id
    JOIN public.chart_of_accounts a ON a.id = l.account_id
    LEFT JOIN public.treasurer_periods p ON p.id = e.period_id
    WHERE a.account_type IN ('income','expense')
      AND e.entry_date BETWEEN v_start AND v_end
      AND COALESCE(p.period_type, 'month') <> 'closing'
    GROUP BY a.id, a.code, a.name
    HAVING SUM(l.debit_pence - l.credit_pence) <> 0
    ORDER BY a.code
  LOOP
    INSERT INTO public.journal_lines (entry_id, account_id, debit_pence, credit_pence, description)
    VALUES (v_entry, r.id, GREATEST(-r.net, 0), GREATEST(r.net, 0), 'Close ' || r.code || ' to General Fund');
    v_net := v_net - r.net;
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'No income or expenditure to close for FY %/%', _year, _year + 1;
  END IF;
  IF v_net <> _expected_net THEN
    RAISE EXCEPTION 'The ledger changed since the preview (surplus now %, preview %). Refresh and try again.', v_net / 100.0, _expected_net / 100.0;
  END IF;
  IF v_net <> 0 THEN
    INSERT INTO public.journal_lines (entry_id, account_id, debit_pence, credit_pence, description)
    VALUES (v_entry, v_fund, GREATEST(-v_net, 0), GREATEST(v_net, 0),
            CASE WHEN v_net > 0 THEN 'Surplus' ELSE 'Deficit' END || format(' for FY %s/%s', _year, _year + 1));
  END IF;

  UPDATE public.treasurer_periods
    SET status = 'locked', locked_at = now(), locked_by = auth.uid(), updated_at = now()
    WHERE id = v_period;
  RETURN v_entry;
END;
$$;
REVOKE ALL ON FUNCTION public.post_year_close(integer, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_year_close(integer, bigint) TO authenticated;