-- Public Lodge Profile figures: counts and numbers only, no names or per-member rows.
-- Member rules mirror the KPI Snapshot (src/lib/kpis.ts snapshot()):
--   subscribing = status 'active' and not honorary; honorary = any honorary member;
--   ages from subscribing members with a date of birth; latest initiation over all members.
CREATE OR REPLACE FUNCTION public.get_public_lodge_figures()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH u AS (SELECT public.current_unit_id() AS id),
  m AS (SELECT p.* FROM public.profiles p, u WHERE p.unit_id = u.id),
  sub AS (SELECT * FROM m WHERE status = 'active' AND NOT COALESCE(is_honorary_member, false)),
  ages AS (
    SELECT date_part('year', age((now() AT TIME ZONE 'Europe/London')::date, date_of_birth))::int AS a
    FROM sub WHERE date_of_birth IS NOT NULL
  )
  SELECT jsonb_build_object(
    'subscribing_count', (SELECT count(*) FROM sub),
    'honorary_count', (SELECT count(*) FROM m WHERE COALESCE(is_honorary_member, false)),
    'average_age', (SELECT round(avg(a)::numeric, 1) FROM ages),
    'youngest_age', (SELECT min(a) FROM ages),
    'oldest_age', (SELECT max(a) FROM ages),
    'latest_initiation_date', (SELECT max(initiation_date) FROM m)
  )
$$;
REVOKE ALL ON FUNCTION public.get_public_lodge_figures() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_lodge_figures() TO anon, authenticated;

-- Public profile also carries the full consecration date (already public as the year).
CREATE OR REPLACE FUNCTION public.get_public_unit_profile()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH u AS (SELECT public.current_unit_id() AS id),
  t AS (SELECT * FROM public.lodge_template ORDER BY updated_at DESC NULLS LAST LIMIT 1),
  s AS (SELECT key, value FROM public.unit_settings, u WHERE unit_id = u.id AND key IN ('web_social','province','registrations','meeting_place')),
  r AS (SELECT r.* FROM public.installation_rule_settings r, u WHERE r.unit_id = u.id),
  v AS (SELECT v.* FROM public.venues v WHERE v.id::text = (SELECT value->>'venue_id' FROM s WHERE key = 'meeting_place')),
  c AS (SELECT c.* FROM public.lodge_contact_settings c, u WHERE c.unit_id = u.id)
  SELECT jsonb_build_object(
    'lodge_name', (SELECT NULLIF(trim(lodge_name),'') FROM t),
    'lodge_number', COALESCE((SELECT NULLIF(trim(unit_number),'') FROM r), (SELECT NULLIF(trim(lodge_number),'') FROM t)),
    'consecration_year', left(COALESCE((SELECT consecration_date::text FROM r), (SELECT consecration_date::text FROM t)), 4),
    'consecration_date', COALESCE((SELECT consecration_date::text FROM r), (SELECT consecration_date::text FROM t)),
    'province_name', (SELECT value->>'name' FROM s WHERE key='province'),
    'ico_number', (SELECT value->>'ico_number' FROM s WHERE key='registrations'),
    'facebook_url', (SELECT value->>'facebook_url' FROM s WHERE key='web_social'),
    'instagram_url', (SELECT value->>'instagram_url' FROM s WHERE key='web_social'),
    'twitter_url', (SELECT value->>'twitter_url' FROM s WHERE key='web_social'),
    'venue_name', (SELECT name FROM v),
    'venue_lines', (SELECT display_lines FROM v),
    'site_url', (SELECT site_url FROM c),
    'secretary_email', (SELECT NULLIF(trim(secretary_email),'') FROM c)
  )
$function$;