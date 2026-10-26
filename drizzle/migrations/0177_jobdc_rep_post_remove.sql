-- JOB DC: (a) hide inactive posts from offices held; (b) delete_representative_position.
-- Rollback: supabase/tests/jobdc_rollback.sql
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
    AND op.active IS DISTINCT FROM false
    AND (v.full_access OR (s.from_date <= v.today AND (s.to_date IS NULL OR s.to_date >= v.today)))
  ORDER BY s.from_date DESC, op.order_index DESC NULLS LAST
$function$;

CREATE FUNCTION public.delete_representative_position(_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _unit text := public.my_unit(); _p public.officer_positions%ROWTYPE; _n integer;
BEGIN
  -- Same permission as the board's Deactivate (officer_positions update policy): admin or lodge Secretary.
  IF _uid IS NULL OR NOT (public.has_role(_uid, 'admin'::public.app_role) OR public.is_lodge_secretary(_uid)) THEN
    RAISE EXCEPTION 'Only the Secretary or an admin can remove a representative post' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO _p FROM public.officer_positions WHERE key = _key;
  IF NOT FOUND THEN RAISE EXCEPTION 'This post no longer exists'; END IF;
  IF coalesce(btrim(_p.unit_id), '') = '' THEN
    RAISE EXCEPTION 'Shared lodge offices cannot be removed';
  END IF;
  IF _unit IS NULL OR _p.unit_id <> _unit THEN
    RAISE EXCEPTION 'This post belongs to another lodge';
  END IF;
  IF _p.category IS DISTINCT FROM 'representative' THEN
    RAISE EXCEPTION 'Only representative posts can be removed';
  END IF;
  IF _p.active IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Deactivate this post before removing it';
  END IF;
  -- Returns are generated from live data; a sent return for a year in which this post had an
  -- appointment (created before it was sent), a submitted/acknowledged return record, or a
  -- signature stamped for this office means the post may be on a submitted return.
  -- Note: the two *_return_submissions tables carry no unit_id, so any lodge's sent return for
  -- that year blocks (fails safe).
  IF EXISTS (
       SELECT 1 FROM public.officer_appointments oa
       WHERE oa.position_key = _key AND oa.unit_id = _unit AND (
            EXISTS (SELECT 1 FROM public.provincial_return_submissions s WHERE s.lodge_year = oa.lodge_year AND s.sent_at >= oa.created_at)
         OR EXISTS (SELECT 1 FROM public.installation_return_submissions s WHERE s.lodge_year = oa.lodge_year AND s.sent_at >= oa.created_at)
         OR EXISTS (SELECT 1 FROM public.secretary_returns r
                    WHERE r.unit_id = _unit AND r.masonic_year = oa.lodge_year
                      AND r.return_type IN ('provincial_return','installation_return')
                      AND r.status IN ('submitted','acknowledged')
                      AND coalesce(r.date_submitted::timestamptz, r.updated_at) >= oa.created_at)))
     OR EXISTS (SELECT 1 FROM public.signature_usage_audit a WHERE a.office_key = _key AND a.unit_id = _unit)
  THEN
    RAISE EXCEPTION 'This post appears in a submitted return; leave it deactivated';
  END IF;
  -- Appointment deletions are audited by the existing officer_appointments_audit trigger.
  DELETE FROM public.officer_appointments WHERE position_key = _key AND unit_id = _unit;
  GET DIAGNOSTICS _n = ROW_COUNT;
  DELETE FROM public.officer_positions WHERE key = _key AND unit_id = _unit;
  RETURN jsonb_build_object('deleted_appointments', _n);
END $function$;
REVOKE ALL ON FUNCTION public.delete_representative_position(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_representative_position(text) TO authenticated, service_role;