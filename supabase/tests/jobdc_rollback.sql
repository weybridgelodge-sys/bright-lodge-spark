-- JOB DC rollback (0177)
DROP FUNCTION IF EXISTS public.delete_representative_position(text);
-- Restore original get_member_offices_held (grants unchanged: postgres, authenticated, service_role):
CREATE OR REPLACE FUNCTION public.get_member_offices_held(_member uuid)
 RETURNS TABLE(position_key text, label text, from_date date, to_date date, first_year integer, last_year integer, is_current boolean, is_upcoming boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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
