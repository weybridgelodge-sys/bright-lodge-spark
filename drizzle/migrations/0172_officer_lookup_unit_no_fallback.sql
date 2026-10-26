-- JOB CX (stage 2): remove the temporary no-session one-lodge fallback. No session and no unit = NULL (matches nothing).
CREATE OR REPLACE FUNCTION public.officer_lookup_unit(_unit text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN nullif(btrim(_unit), '') IS NOT NULL THEN btrim(_unit)
    WHEN auth.uid() IS NOT NULL THEN public.my_unit()
    ELSE NULL
  END
$function$;

-- ROLLBACK (original body, also in supabase/tests/jobcx_rollback.sql):
-- CREATE OR REPLACE FUNCTION public.officer_lookup_unit(_unit text DEFAULT NULL::text)
--  RETURNS text
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
--   SELECT CASE
--     WHEN nullif(btrim(_unit), '') IS NOT NULL THEN btrim(_unit)
--     WHEN auth.uid() IS NOT NULL THEN public.my_unit()
--     ELSE (SELECT min(u.id) FROM public.units u HAVING count(*) = 1)
--   END
-- $function$;