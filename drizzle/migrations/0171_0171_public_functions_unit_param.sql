-- JOB CW: optional trailing _unit on three public functions. _unit NULL = unchanged
-- behaviour; _unit given = that lodge only (unknown/blank = empty, never a fallback).
DROP FUNCTION public.get_officers_public(integer);
CREATE FUNCTION public.get_officers_public(_year integer DEFAULT NULL::integer, _unit text DEFAULT NULL::text)
 RETURNS TABLE(position_key text, title text, first_name text, middle_name text, last_name text, post_nominals text, provincial_rank text, grand_rank text, is_past_master boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH at_date AS (
    SELECT CASE WHEN _year IS NULL OR _year = public.current_officer_year()
      THEN (now() AT TIME ZONE 'Europe/London')::date
      ELSE public.officer_year_start(_year) END AS d
  ), sel AS (
    SELECT CASE WHEN _unit IS NULL THEN NULL ELSE (SELECT u.id FROM public.units u WHERE u.id = nullif(btrim(_unit), '')) END AS id
  ), holders AS (
    SELECT op.key, public.current_officer_holder(op.key, (SELECT d FROM at_date), (SELECT id FROM sel)) AS member_id
    FROM public.officer_positions op
    WHERE _unit IS NULL OR (SELECT id FROM sel) IS NOT NULL
  )
  SELECT h.key::text, p.title, p.first_name, p.middle_name, p.last_name, p.post_nominals,
         p.provincial_rank, p.grand_rank, COALESCE(p.is_past_master, false)
  FROM holders h JOIN public.profiles p ON p.id = h.member_id
$function$;
REVOKE ALL ON FUNCTION public.get_officers_public(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_officers_public(integer, text) TO anon, authenticated, service_role;

DROP FUNCTION public.get_officers_public_year();
CREATE FUNCTION public.get_officers_public_year(_unit text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT oa.lodge_year
  FROM public.officer_appointments oa
  LEFT JOIN public.officer_positions op ON op.key = oa.position_key
  WHERE oa.position_key = 'worshipful_master' AND NOT oa.is_projection AND oa.member_id IS NOT NULL
    AND oa.unit_id = CASE WHEN _unit IS NULL THEN public.officer_lookup_unit(NULL)
                          ELSE (SELECT u.id FROM public.units u WHERE u.id = nullif(btrim(_unit), '')) END
    AND public.officer_appointment_effective(oa.lodge_year, oa.appointed_on, COALESCE(op.is_progressive, false))
        <= (now() AT TIME ZONE 'Europe/London')::date
  ORDER BY oa.lodge_year DESC, oa.updated_at DESC
  LIMIT 1
$function$;
GRANT EXECUTE ON FUNCTION public.get_officers_public_year(text) TO PUBLIC, anon, authenticated, service_role;

DROP FUNCTION public.get_public_booking_details();
CREATE FUNCTION public.get_public_booking_details(_unit text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH u AS (SELECT CASE WHEN _unit IS NULL THEN public.current_unit_id()
                         ELSE (SELECT x.id FROM public.units x WHERE x.id = nullif(btrim(_unit), '')) END AS id),
  t AS (SELECT * FROM public.lodge_template ORDER BY updated_at DESC NULLS LAST LIMIT 1),
  s AS (SELECT key, value FROM public.unit_settings, u WHERE unit_id = u.id AND key IN ('bank_details','payment_wording','sign_off','booking_contact_email')),
  c AS (SELECT NULLIF(trim((SELECT value->>'email' FROM s WHERE key='booking_contact_email')),'') AS explicit,
               CASE WHEN public.current_officer_holder('assistant_secretary', NULL, (SELECT id FROM u)) IS NOT NULL THEN NULLIF(trim(l.assistant_secretary_email),'') END AS asst,
               (public.current_officer_holder('assistant_secretary', NULL, (SELECT id FROM u)) IS NOT NULL) AS asst_held,
               NULLIF(trim(l.secretary_email),'') AS sec
        FROM (SELECT 1) o LEFT JOIN public.lodge_contact_settings l ON l.unit_id = (SELECT id FROM u))
  SELECT CASE WHEN _unit IS NOT NULL AND (SELECT id FROM u) IS NULL THEN '{}'::jsonb ELSE jsonb_build_object(
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
  ) END
$function$;
REVOKE ALL ON FUNCTION public.get_public_booking_details(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booking_details(text) TO anon, authenticated, service_role;

-- ROLLBACK: original definitions are in supabase/tests/jobcw_rollback.sql (restores the old signatures and grants).-- CREATE OR REPLACE FUNCTION public.get_officers_public(_year integer DEFAULT NULL::integer)
--  RETURNS TABLE(position_key text, title text, first_name text, middle_name text, last_name text, post_nominals text, provincial_rank text, grand_rank text, is_past_master boolean)
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
--   WITH at_date AS (
--     SELECT CASE WHEN _year IS NULL OR _year = public.current_officer_year()
--       THEN (now() AT TIME ZONE 'Europe/London')::date
--       ELSE public.officer_year_start(_year) END AS d
--   ), holders AS (
--     SELECT op.key, public.current_officer_holder(op.key, (SELECT d FROM at_date)) AS member_id
--     FROM public.officer_positions op
--   )
--   SELECT h.key::text, p.title, p.first_name, p.middle_name, p.last_name, p.post_nominals,
--          p.provincial_rank, p.grand_rank, COALESCE(p.is_past_master, false)
--   FROM holders h JOIN public.profiles p ON p.id = h.member_id
-- $function$
-- 
-- ;
-- CREATE OR REPLACE FUNCTION public.get_officers_public_year()
--  RETURNS integer
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
--   SELECT oa.lodge_year
--   FROM public.officer_appointments oa
--   LEFT JOIN public.officer_positions op ON op.key = oa.position_key
--   WHERE oa.position_key = 'worshipful_master' AND NOT oa.is_projection AND oa.member_id IS NOT NULL
--     AND oa.unit_id = public.officer_lookup_unit(NULL)
--     AND public.officer_appointment_effective(oa.lodge_year, oa.appointed_on, COALESCE(op.is_progressive, false))
--         <= (now() AT TIME ZONE 'Europe/London')::date
--   ORDER BY oa.lodge_year DESC, oa.updated_at DESC
--   LIMIT 1
-- $function$
-- 
-- ;
-- CREATE OR REPLACE FUNCTION public.get_public_booking_details()
--  RETURNS jsonb
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
--   WITH u AS (SELECT public.current_unit_id() AS id),
--   t AS (SELECT * FROM public.lodge_template ORDER BY updated_at DESC NULLS LAST LIMIT 1),
--   s AS (SELECT key, value FROM public.unit_settings, u WHERE unit_id = u.id AND key IN ('bank_details','payment_wording','sign_off','booking_contact_email')),
--   c AS (SELECT NULLIF(trim((SELECT value->>'email' FROM s WHERE key='booking_contact_email')),'') AS explicit,
--                CASE WHEN public.current_officer_holder('assistant_secretary', NULL, (SELECT id FROM u)) IS NOT NULL THEN NULLIF(trim(l.assistant_secretary_email),'') END AS asst,
--                (public.current_officer_holder('assistant_secretary', NULL, (SELECT id FROM u)) IS NOT NULL) AS asst_held,
--                NULLIF(trim(l.secretary_email),'') AS sec
--         FROM (SELECT 1) o LEFT JOIN public.lodge_contact_settings l ON l.unit_id = (SELECT id FROM u))
--   SELECT jsonb_build_object(
--     'lodge_name', (SELECT COALESCE(NULLIF(trim(t.lodge_name),''), lc.sender_name) FROM (SELECT 1) o LEFT JOIN t ON true LEFT JOIN public.lodge_contact_settings lc ON lc.unit_id = (SELECT id FROM u)),
--     'lodge_number', (SELECT COALESCE(NULLIF(trim(r.unit_number),''), NULLIF(trim(t.lodge_number),'')) FROM (SELECT 1) o LEFT JOIN t ON true LEFT JOIN public.installation_rule_settings r ON r.unit_id = (SELECT id FROM u)),
--     'account_name', (SELECT value->>'account_name' FROM s WHERE key='bank_details'),
--     'sort_code', (SELECT value->>'sort_code' FROM s WHERE key='bank_details'),
--     'account_number', (SELECT value->>'account_number' FROM s WHERE key='bank_details'),
--     'reference_pattern', (SELECT value->>'reference_pattern' FROM s WHERE key='bank_details'),
--     'card_wording', (SELECT value->>'card_wording' FROM s WHERE key='payment_wording'),
--     'cheque_payee', (SELECT value->>'cheque_payee' FROM s WHERE key='payment_wording'),
--     'sign_off_override', (SELECT value->>'override' FROM s WHERE key='sign_off'),
--     -- Booking contact: Unit Setup address, else Assistant Secretary (only if the office is held), else Secretary.
--     'contact_email', (SELECT COALESCE(explicit, asst, sec) FROM c),
--     'contact_office', (SELECT CASE WHEN explicit IS NOT NULL THEN '' WHEN asst IS NOT NULL THEN 'Assistant Secretary' ELSE 'Secretary' END FROM c)
--   )
-- $function$
-- 
-- ;