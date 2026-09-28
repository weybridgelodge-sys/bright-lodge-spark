CREATE OR REPLACE FUNCTION public.year_audit_snapshot_base(_year integer)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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

  -- Prior years' P&L not yet carried into 3000: earlier ordinary lines plus any closing
  -- journals already dated inside the range (which cancel the years they closed).
  SELECT COALESCE(SUM(l.credit_pence - l.debit_pence),0)::bigint INTO v_prior
  FROM public.journal_lines l JOIN public.journal_entries e ON e.id = l.entry_id
  JOIN public.chart_of_accounts a ON a.id = l.account_id
  LEFT JOIN public.treasurer_periods p ON p.id = e.period_id
  WHERE a.account_type IN ('income','expense')
    AND (e.entry_date < v_start OR (COALESCE(p.period_type,'month') = 'closing' AND e.entry_date <= v_end));

  RETURN jsonb_build_object(
    'masonic_year', _year, 'as_at', v_end, 'taken_at', now(),
    'income_expenditure', jsonb_build_object('income', v_income, 'expenditure', v_expense, 'surplus', v_income - v_expense),
    'balance_sheet', jsonb_build_object('assets', v_assets, 'liabilities', v_liab, 'net_assets', v_assets - v_liab,
       'fund_bf', v_equity + v_prior, 'surplus', v_income - v_expense, 'total_funds', v_equity + v_prior + v_income - v_expense),
    'trial_balance', jsonb_build_object('debit', v_dr + GREATEST(-v_prior,0), 'credit', v_cr + GREATEST(v_prior,0)),
    'accounts', v_accounts
  );
END $function$;
REVOKE ALL ON FUNCTION public.year_audit_snapshot_base(integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.year_audit_snapshot(_year integer)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT public.year_audit_snapshot_base(_year)
    || jsonb_build_object('comparative', public.year_audit_snapshot_base(_year - 1));
$function$;