ALTER TABLE public.treasurer_periods
  ADD COLUMN IF NOT EXISTS period_type text NOT NULL DEFAULT 'month',
  ADD COLUMN IF NOT EXISTS masonic_year integer;
ALTER TABLE public.treasurer_periods
  ADD CONSTRAINT treasurer_periods_period_type_chk CHECK (period_type IN ('month','closing'));
CREATE UNIQUE INDEX IF NOT EXISTS treasurer_periods_one_closing_per_year
  ON public.treasurer_periods (masonic_year) WHERE period_type = 'closing';
CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_one_year_close_per_period
  ON public.journal_entries (period_id) WHERE source_type = 'year_close';

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