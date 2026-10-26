-- JOB CQ: officer functions match the appointment's own lodge (officer_appointments.unit_id).
-- ROLLBACK: re-run the ORIGINAL bodies in the comment block at the end of this file, then
--           DROP FUNCTION public.officer_lookup_unit(text);

-- Which lodge an officer question is about:
--   1. the lodge passed in;
--   2. else a signed-in caller's own lodge (strict: blank = no lodge = nothing matches);
--   3. else (no session: anon page, service-role function, scheduled task) the one lodge,
--      only while exactly one lodge exists; with two or more = nothing matches.
--      TEMPORARY: remove before a second lodge goes live (see AGENTS.md).
CREATE OR REPLACE FUNCTION public.officer_lookup_unit(_unit text DEFAULT NULL)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN nullif(btrim(_unit), '') IS NOT NULL THEN btrim(_unit)
    WHEN auth.uid() IS NOT NULL THEN public.my_unit()
    ELSE (SELECT min(u.id) FROM public.units u HAVING count(*) = 1)
  END
$$;
REVOKE ALL ON FUNCTION public.officer_lookup_unit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.officer_lookup_unit(text) TO anon, authenticated, service_role;

-- Core: same name/arguments; appointment lodge must equal the resolved lodge.
-- Blank-lodge appointments and the old "blank position lodge = every lodge" rule match nothing.
CREATE OR REPLACE FUNCTION public.current_officer_holder(_position_key text, _at date DEFAULT NULL::date, _unit text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT oa.member_id
  FROM public.officer_appointments oa
  LEFT JOIN public.officer_positions op ON op.key = oa.position_key
  WHERE oa.position_key = _position_key AND NOT oa.is_projection AND oa.member_id IS NOT NULL
    AND oa.unit_id = public.officer_lookup_unit(_unit)
    AND public.officer_appointment_effective(oa.lodge_year, oa.appointed_on, COALESCE(op.is_progressive, false))
        <= COALESCE(_at, (now() AT TIME ZONE 'Europe/London')::date)
  ORDER BY oa.lodge_year DESC, oa.updated_at DESC
  LIMIT 1
$function$;

-- The person's OWN lodge (not the caller's), so service-role checks keep working.
CREATE OR REPLACE FUNCTION public.is_current_officer(_user_id uuid, _position_key text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH m AS (SELECT (SELECT nullif(btrim(p.unit_id), '') FROM public.profiles p WHERE p.id = _user_id) AS u)
  SELECT _user_id IS NOT NULL
     AND public.current_officer_holder(_position_key, NULL, (SELECT u FROM m)) = _user_id
     AND (SELECT u FROM m) IS NOT NULL
  FROM m
$function$;

CREATE OR REPLACE FUNCTION public.current_office_label(_user_id uuid)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT op.label FROM public.officer_positions op
  WHERE (SELECT nullif(btrim(p.unit_id), '') FROM public.profiles p WHERE p.id = _user_id) IS NOT NULL
    AND public.current_officer_holder(op.key, NULL,
      (SELECT nullif(btrim(p.unit_id), '') FROM public.profiles p WHERE p.id = _user_id)) = _user_id
  ORDER BY op.order_index DESC LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.get_officers_public_year()
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT oa.lodge_year
  FROM public.officer_appointments oa
  LEFT JOIN public.officer_positions op ON op.key = oa.position_key
  WHERE oa.position_key = 'worshipful_master' AND NOT oa.is_projection AND oa.member_id IS NOT NULL
    AND oa.unit_id = public.officer_lookup_unit(NULL)
    AND public.officer_appointment_effective(oa.lodge_year, oa.appointed_on, COALESCE(op.is_progressive, false))
        <= (now() AT TIME ZONE 'Europe/London')::date
  ORDER BY oa.lodge_year DESC, oa.updated_at DESC
  LIMIT 1
$function$;

-- Offices held: only the member's own lodge's appointments (one history per lodge).
CREATE OR REPLACE FUNCTION public.get_member_offices_held(_member uuid)
 RETURNS TABLE(position_key text, label text, from_date date, to_date date, first_year integer, last_year integer, is_current boolean, is_upcoming boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH viewer AS (
    SELECT auth.uid() = _member
        OR public.has_role(auth.uid(),'admin'::public.app_role)
        OR public.has_role(auth.uid(),'secretary'::public.app_role)
        OR public.is_current_officer(auth.uid(),'secretary')
        OR public.is_current_officer(auth.uid(),'worshipful_master') AS full_access,
           (now() AT TIME ZONE 'Europe/London')::date AS today
  ), latest AS (
    SELECT DISTINCT ON (oa.position_key, oa.lodge_year)
      oa.position_key, oa.lodge_year, oa.member_id,
      public.officer_appointment_effective(oa.lodge_year, oa.appointed_on, COALESCE(op.is_progressive,false)) AS eff
    FROM public.officer_appointments oa
    LEFT JOIN public.officer_positions op ON op.key = oa.position_key
    WHERE NOT oa.is_projection
      AND oa.unit_id = (SELECT nullif(btrim(p.unit_id), '') FROM public.profiles p WHERE p.id = _member)
    ORDER BY oa.position_key, oa.lodge_year, oa.updated_at DESC
  ), marked AS (
    SELECT l.*, CASE WHEN l.member_id IS NOT DISTINCT FROM lag(l.member_id) OVER w
                     AND lag(l.lodge_year) OVER w IS NOT NULL THEN 0 ELSE 1 END AS brk
    FROM latest l WINDOW w AS (PARTITION BY l.position_key ORDER BY l.lodge_year)
  ), grouped AS (
    SELECT m.*, sum(brk) OVER (PARTITION BY m.position_key ORDER BY m.lodge_year) AS grp FROM marked m
  ), seg AS (
    SELECT g.position_key, g.member_id, g.grp, min(g.eff) AS from_date,
           min(g.lodge_year) AS first_year, max(g.lodge_year) AS last_year
    FROM grouped g GROUP BY g.position_key, g.member_id, g.grp
  ), seg2 AS (
    SELECT s.*, (lead(s.from_date) OVER (PARTITION BY s.position_key ORDER BY s.grp)) - 1 AS to_date FROM seg s
  )
  SELECT s.position_key, COALESCE(op.label, s.position_key), s.from_date, s.to_date, s.first_year, s.last_year,
         (s.from_date <= v.today AND (s.to_date IS NULL OR s.to_date >= v.today)),
         (s.from_date > v.today)
  FROM seg2 s CROSS JOIN viewer v
  LEFT JOIN public.officer_positions op ON op.key = s.position_key
  WHERE s.member_id = _member AND auth.uid() IS NOT NULL
    AND (v.full_access OR (s.from_date <= v.today AND (s.to_date IS NULL OR s.to_date >= v.today)))
  ORDER BY s.from_date DESC, op.order_index DESC NULLS LAST
$function$;

-- Secretary exemption: "latest Secretary appointment on or before the year" within the same lodge.
CREATE OR REPLACE FUNCTION public.subscription_exempt_member_ids(_year integer)
 RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT DISTINCT oa.member_id FROM public.officer_appointments oa
  WHERE oa.position_key = 'secretary'
    AND oa.member_id IS NOT NULL
    AND oa.unit_id IS NOT NULL
    AND oa.lodge_year = (SELECT max(o2.lodge_year) FROM public.officer_appointments o2
                         WHERE o2.position_key = oa.position_key AND o2.unit_id = oa.unit_id
                           AND o2.lodge_year <= _year)
$function$;

-- dues_calculate_amount: identical except the Secretary-exemption SELECT reads only the member's own lodge.
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

  SELECT true, 'Secretary'
  INTO v_exempt, v_exempt_reason
  FROM public.officer_appointments oa
  WHERE oa.member_id = _member_id
    AND oa.position_key = 'secretary'
    AND oa.unit_id = (SELECT nullif(btrim(p.unit_id), '') FROM public.profiles p WHERE p.id = _member_id)
    AND oa.lodge_year = (
      SELECT max(o2.lodge_year) FROM public.officer_appointments o2
      WHERE o2.position_key = oa.position_key AND o2.unit_id = oa.unit_id AND o2.lodge_year <= _lodge_year)
  LIMIT 1;
  IF v_exempt IS NULL THEN v_exempt := false; END IF;
  IF NOT v_exempt AND EXISTS (SELECT 1 FROM public.profiles WHERE id = _member_id AND is_honorary_member) THEN
    v_exempt := true; v_exempt_reason := 'Honorary member';
  END IF;

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
      format('Exempt (%s) — £0 due.', v_exempt_reason)
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

-- get_public_booking_details: identical except the Assistant Secretary lookups pass the page's own lodge.
CREATE OR REPLACE FUNCTION public.get_public_booking_details()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH u AS (SELECT public.current_unit_id() AS id),
  t AS (SELECT * FROM public.lodge_template ORDER BY updated_at DESC NULLS LAST LIMIT 1),
  s AS (SELECT key, value FROM public.unit_settings, u WHERE unit_id = u.id AND key IN ('bank_details','payment_wording','sign_off','booking_contact_email')),
  c AS (SELECT NULLIF(trim((SELECT value->>'email' FROM s WHERE key='booking_contact_email')),'') AS explicit,
               CASE WHEN public.current_officer_holder('assistant_secretary', NULL, (SELECT id FROM u)) IS NOT NULL THEN NULLIF(trim(l.assistant_secretary_email),'') END AS asst,
               (public.current_officer_holder('assistant_secretary', NULL, (SELECT id FROM u)) IS NOT NULL) AS asst_held,
               NULLIF(trim(l.secretary_email),'') AS sec
        FROM (SELECT 1) o LEFT JOIN public.lodge_contact_settings l ON l.unit_id = (SELECT id FROM u))
  SELECT jsonb_build_object(
    'lodge_name', (SELECT COALESCE(NULLIF(trim(t.lodge_name),''), lc.sender_name) FROM (SELECT 1) o LEFT JOIN t ON true LEFT JOIN public.lodge_contact_settings lc ON lc.unit_id = (SELECT id FROM u)),
    'lodge_number', (SELECT COALESCE(NULLIF(trim(r.unit_number),''), NULLIF(trim(t.lodge_number),'')) FROM (SELECT 1) o LEFT JOIN t ON true LEFT JOIN public.installation_rule_settings r ON r.unit_id = (SELECT id FROM u)),
    'account_name', (SELECT value->>'account_name' FROM s WHERE key='bank_details'),
    'sort_code', (SELECT value->>'sort_code' FROM s WHERE key='bank_details'),
    'account_number', (SELECT value->>'account_number' FROM s WHERE key='bank_details'),
    'reference_pattern', (SELECT value->>'reference_pattern' FROM s WHERE key='bank_details'),
    'card_wording', (SELECT value->>'card_wording' FROM s WHERE key='payment_wording'),
    'cheque_payee', (SELECT value->>'cheque_payee' FROM s WHERE key='payment_wording'),
    'sign_off_override', (SELECT value->>'override' FROM s WHERE key='sign_off'),
    -- Booking contact: Unit Setup address, else Assistant Secretary (only if the office is held), else Secretary.
    'contact_email', (SELECT COALESCE(explicit, asst, sec) FROM c),
    'contact_office', (SELECT CASE WHEN explicit IS NOT NULL THEN '' WHEN asst IS NOT NULL THEN 'Assistant Secretary' ELSE 'Secretary' END FROM c)
  )
$function$;

-- ===================== ROLLBACK: ORIGINAL BODIES =====================
-- The verbatim original bodies of all 8 functions (as captured from the live database
-- before this migration) are kept in supabase/tests/jobcq_rollback.sql, ready to run.
-- Order: run that file, then DROP FUNCTION public.officer_lookup_unit(text);