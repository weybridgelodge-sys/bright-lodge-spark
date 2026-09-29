ALTER TABLE public.subscription_settings ADD COLUMN IF NOT EXISTS relief_chest_pence integer NOT NULL DEFAULT 1000;

CREATE OR REPLACE FUNCTION public.subscription_exempt_member_ids(_year integer)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT oa.member_id FROM public.officer_appointments oa
  WHERE oa.position_key IN ('treasurer','secretary')
    AND oa.lodge_year = (SELECT max(o2.lodge_year) FROM public.officer_appointments o2
                         WHERE o2.position_key = oa.position_key AND o2.lodge_year <= _year)
$$;
REVOKE ALL ON FUNCTION public.subscription_exempt_member_ids(integer) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.subscription_accrual_preview(_year integer)
RETURNS TABLE(member_id uuid, full_name text, under_25 boolean, dob_missing boolean, exempt_reason text, amount_pence integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rate int; v_start date := make_date(_year,10,1);
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_current_officer(auth.uid(),'treasurer')) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  SELECT annual_rate_pence INTO v_rate FROM public.subscription_settings ORDER BY updated_at DESC LIMIT 1;
  v_rate := coalesce(v_rate, 25000);
  RETURN QUERY
  SELECT p.id,
         trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),
         (p.date_of_birth IS NOT NULL AND p.date_of_birth > (v_start - interval '25 years')::date),
         p.date_of_birth IS NULL,
         CASE WHEN p.id IN (SELECT public.subscription_exempt_member_ids(_year)) THEN 'Treasurer/Secretary' END,
         CASE WHEN p.id IN (SELECT public.subscription_exempt_member_ids(_year)) THEN 0
              WHEN p.date_of_birth IS NOT NULL AND p.date_of_birth > (v_start - interval '25 years')::date THEN v_rate/2
              ELSE v_rate END
  FROM public.profiles p
  WHERE p.status = 'active'
  ORDER BY p.last_name, p.first_name;
END $$;
REVOKE ALL ON FUNCTION public.subscription_accrual_preview(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscription_accrual_preview(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.post_subscription_accrual(_year integer, _period_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_entry uuid; r record; pot record; v_rate int; v_relief int; v_pots int; v_share int; v_count int := 0; v_total int := 0;
  a1100 uuid; a4000 uuid; a3100 uuid; a2200 uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_current_officer(auth.uid(),'treasurer')) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  IF public.is_period_locked(_period_id) THEN RAISE EXCEPTION 'period is locked'; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE
      (source_type = 'subscription_accrual' AND description LIKE 'Subscriptions accrued '||_year||'/%')
      OR description LIKE 'Subscriptions accrued '||_year||'/'||lpad(((_year+1)%100)::text,2,'0')||'%') THEN
    RAISE EXCEPTION 'An accrual for %/% already exists', _year, (_year+1)%100;
  END IF;
  SELECT id INTO a1100 FROM chart_of_accounts WHERE code='1100';
  SELECT id INTO a4000 FROM chart_of_accounts WHERE code='4000';
  SELECT id INTO a3100 FROM chart_of_accounts WHERE code='3100';
  SELECT id INTO a2200 FROM chart_of_accounts WHERE code='2200';
  SELECT annual_rate_pence, relief_chest_pence INTO v_rate, v_relief FROM subscription_settings ORDER BY updated_at DESC LIMIT 1;
  v_rate := coalesce(v_rate,25000); v_relief := coalesce(v_relief,1000);

  INSERT INTO journal_entries(entry_date, description, source_type, period_id, created_by)
  VALUES (make_date(_year,10,1), 'Subscriptions accrued '||_year||'/'||lpad(((_year+1)%100)::text,2,'0'),
          'subscription_accrual', _period_id, auth.uid())
  RETURNING id INTO v_entry;

  FOR r IN SELECT * FROM public.subscription_accrual_preview(_year) WHERE amount_pence > 0 LOOP
    v_count := v_count + 1; v_total := v_total + r.amount_pence; v_pots := 0;
    INSERT INTO journal_lines(entry_id, account_id, debit_pence, credit_pence, description)
      VALUES (v_entry, a1100, r.amount_pence, 0, r.full_name);
    FOR pot IN SELECT fund_code, label, annual_pence FROM subscription_reserve_pots WHERE fund_code <> 'MASTERS_FUND' ORDER BY sort_order LOOP
      v_share := CASE WHEN r.under_25 THEN round(pot.annual_pence/2.0)::int ELSE pot.annual_pence END;
      v_pots := v_pots + v_share;
      INSERT INTO journal_lines(entry_id, account_id, debit_pence, credit_pence, description, fund_code)
        VALUES (v_entry, a3100, 0, v_share, r.full_name||' — '||pot.label, pot.fund_code);
    END LOOP;
    v_share := CASE WHEN r.under_25 THEN round(v_relief/2.0)::int ELSE v_relief END;
    INSERT INTO journal_lines(entry_id, account_id, debit_pence, credit_pence, description)
      VALUES (v_entry, a2200, 0, v_share, r.full_name||' — Relief Chest');
    INSERT INTO journal_lines(entry_id, account_id, debit_pence, credit_pence, description)
      VALUES (v_entry, a4000, 0, r.amount_pence - v_pots - v_share, r.full_name||' — Subscription');
  END LOOP;
  IF v_count = 0 THEN RAISE EXCEPTION 'No chargeable members'; END IF;
  UPDATE journal_entries SET description = description||' — '||v_count||' chargeable members (£'||to_char(v_total/100.0,'FM999,990.00')||')' WHERE id = v_entry;
  RETURN v_entry;
END $$;
REVOKE ALL ON FUNCTION public.post_subscription_accrual(integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_subscription_accrual(integer, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dues_calculate_amount(_member_id uuid, _lodge_year integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_annual int := 0;
  v_join date;
  v_dob date;
  v_year_start date := make_date(_lodge_year, 10, 1);
  v_year_end date := make_date(_lodge_year + 1, 9, 30);
  v_join_year int;
  v_is_first boolean := false;
  v_meetings_total int := 4;
  v_meetings_actual int := 0;
  v_meetings_remaining int := 0;
  v_proration numeric := 1.0;
  v_under21 boolean := false;
  v_dob_missing boolean := false;
  v_under21_applied boolean := false;
  v_exempt boolean := false;
  v_exempt_reason text := NULL;
  v_final numeric;
  v_breakdown jsonb := '[]'::jsonb;
  v_pct_line text;
  v_start_dt timestamptz := (v_year_start)::timestamptz;
  v_end_dt   timestamptz := ((v_year_end + 1))::timestamptz;
  v_ref_date date;
BEGIN
  -- NB: v_under21 / is_under_21 keys are legacy names; the rule is under 25 (Bylaw 6).
  IF _member_id <> auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'secretary')
     AND NOT public.has_role(auth.uid(), 'worshipful_master')
     AND NOT public.is_current_officer(auth.uid(), 'treasurer')
  THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  SELECT annual_amount_pence INTO v_annual
  FROM public.dues_settings
  WHERE effective_lodge_year <= _lodge_year
  ORDER BY effective_lodge_year DESC
  LIMIT 1;
  IF v_annual IS NULL THEN v_annual := 0; END IF;

  SELECT joined_lodge_date, date_of_birth INTO v_join, v_dob
  FROM public.profiles WHERE id = _member_id;

  SELECT true, CASE op.key WHEN 'treasurer' THEN 'Treasurer' WHEN 'secretary' THEN 'Secretary' END
  INTO v_exempt, v_exempt_reason
  FROM public.officer_appointments oa
  JOIN public.officer_positions op ON op.key = oa.position_key
  WHERE oa.member_id = _member_id
    AND oa.position_key IN ('treasurer','secretary')
    AND oa.lodge_year = (
      SELECT max(o2.lodge_year) FROM public.officer_appointments o2
      WHERE o2.position_key = oa.position_key AND o2.lodge_year <= _lodge_year)
  ORDER BY oa.position_key
  LIMIT 1;
  IF v_exempt IS NULL THEN v_exempt := false; END IF;

  IF v_join IS NOT NULL THEN
    v_join_year := CASE WHEN EXTRACT(MONTH FROM v_join)::int >= 10
                        THEN EXTRACT(YEAR FROM v_join)::int
                        ELSE EXTRACT(YEAR FROM v_join)::int - 1 END;
    v_is_first := (v_join_year = _lodge_year);
  END IF;

  SELECT COUNT(*) INTO v_meetings_actual
  FROM public.lodge_events
  WHERE published = true
    AND event_date >= v_start_dt
    AND event_date <  v_end_dt;

  IF v_is_first THEN
    v_ref_date := GREATEST(v_join, v_year_start);
    SELECT COUNT(*) INTO v_meetings_remaining
    FROM public.lodge_events
    WHERE published = true
      AND event_date >= v_ref_date::timestamptz
      AND event_date <  v_end_dt;
    IF v_meetings_remaining > v_meetings_total THEN
      v_meetings_remaining := v_meetings_total;
    END IF;
    IF v_meetings_total > 0 THEN
      v_proration := (v_meetings_remaining::numeric / v_meetings_total::numeric);
    END IF;
  ELSE
    v_meetings_remaining := v_meetings_total;
    v_proration := 1.0;
  END IF;

  IF v_dob IS NULL THEN
    v_dob_missing := true;
  ELSE
    v_under21 := (v_dob > (v_year_start - INTERVAL '25 years')::date);
  END IF;

  IF v_exempt THEN
    v_final := 0;
  ELSE
    v_final := v_annual::numeric * v_proration;
    IF v_under21 THEN
      v_final := v_final * 0.5;
      v_under21_applied := true;
    END IF;
  END IF;

  IF v_exempt THEN
    v_breakdown := v_breakdown || jsonb_build_array(
      format('Exempt as %s — £0 due.', v_exempt_reason)
    );
  ELSE
    IF v_is_first THEN
      v_pct_line := format('%s of %s remaining meetings × annual rate %s = %s',
        v_meetings_remaining, v_meetings_total,
        to_char(v_annual/100.0, 'FM£999,990.00'),
        to_char((v_annual::numeric * v_proration)/100.0, 'FM£999,990.00'));
      v_breakdown := v_breakdown || jsonb_build_array(v_pct_line);
    ELSE
      v_breakdown := v_breakdown || jsonb_build_array(
        format('Full annual rate %s (not a first-year member).',
          to_char(v_annual/100.0, 'FM£999,990.00'))
      );
    END IF;
    IF v_under21_applied THEN
      v_breakdown := v_breakdown || jsonb_build_array(
        format('50%% under-25 rate applied → %s',
          to_char(v_final/100.0, 'FM£999,990.00'))
      );
    ELSIF v_dob_missing THEN
      v_breakdown := v_breakdown || jsonb_build_array(
        'Date of birth missing on profile — under-25 discount NOT applied. Add DOB in profile to enable.'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'annual_pence', v_annual,
    'final_pence', ROUND(v_final)::int,
    'is_first_year', v_is_first,
    'is_exempt', v_exempt,
    'exempt_reason', v_exempt_reason,
    'meetings_total', v_meetings_total,
    'meetings_actual_in_year', v_meetings_actual,
    'meetings_remaining', v_meetings_remaining,
    'proration_pct', ROUND(v_proration * 10000)::int / 100.0,
    'is_under_21', v_under21,
    'under_21_applied', v_under21_applied,
    'dob_missing', v_dob_missing,
    'joined_lodge_date', v_join,
    'lodge_year', _lodge_year,
    'breakdown', v_breakdown
  );
END;
$function$;