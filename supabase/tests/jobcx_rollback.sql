-- JOB CX rollback: restores the temporary no-session one-lodge fallback in officer_lookup_unit.
CREATE OR REPLACE FUNCTION public.officer_lookup_unit(_unit text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN nullif(btrim(_unit), '') IS NOT NULL THEN btrim(_unit)
    WHEN auth.uid() IS NOT NULL THEN public.my_unit()
    ELSE (SELECT min(u.id) FROM public.units u HAVING count(*) = 1)
  END
$function$;
