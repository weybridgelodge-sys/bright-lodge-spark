-- JOB DD: public officer functions skip inactive posts (active IS FALSE; NULL = active).
-- Rollback: supabase/tests/jobdd_rollback.sql. CREATE OR REPLACE keeps signature and grants.
CREATE OR REPLACE FUNCTION public.get_officers_public(_year integer DEFAULT NULL::integer, _unit text DEFAULT NULL::text)
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
    WHERE (_unit IS NULL OR (SELECT id FROM sel) IS NOT NULL)
      AND op.active IS DISTINCT FROM false
  )
  SELECT h.key::text, p.title, p.first_name, p.middle_name, p.last_name, p.post_nominals,
         p.provincial_rank, p.grand_rank, COALESCE(p.is_past_master, false)
  FROM holders h JOIN public.profiles p ON p.id = h.member_id
$function$;

CREATE OR REPLACE FUNCTION public.get_officers_public_year(_unit text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT oa.lodge_year
  FROM public.officer_appointments oa
  LEFT JOIN public.officer_positions op ON op.key = oa.position_key
  WHERE oa.position_key = 'worshipful_master' AND NOT oa.is_projection AND oa.member_id IS NOT NULL
    AND op.active IS DISTINCT FROM false
    AND oa.unit_id = CASE WHEN _unit IS NULL THEN public.officer_lookup_unit(NULL)
                          ELSE (SELECT u.id FROM public.units u WHERE u.id = nullif(btrim(_unit), '')) END
    AND public.officer_appointment_effective(oa.lodge_year, oa.appointed_on, COALESCE(op.is_progressive, false))
        <= (now() AT TIME ZONE 'Europe/London')::date
  ORDER BY oa.lodge_year DESC, oa.updated_at DESC
  LIMIT 1
$function$;