-- JOB DB1 rollback: drop the (text) versions, then recreate these originals and their grants.
-- Original ACLs:
--   get_join_us_costs()|{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}|s|{search_path=public}
--   get_lodge_identity()|{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}|s|{search_path=public}
--   get_meeting_pattern()|{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}|s|{search_path=public}
--   get_public_lodge_figures()|{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}|s|{search_path=public}
--   get_public_unit_profile()|{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}|s|{search_path=public}
/*
CREATE OR REPLACE FUNCTION public.get_join_us_costs()
 RETURNS TABLE(annual_dues_pence integer, dining_price_pence integer, ugle_fee_pence integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT s.annual_rate_pence FROM public.subscription_settings s ORDER BY s.updated_at DESC LIMIT 1),
    COALESCE(
      (SELECT m.dining_price_pence FROM public.festive_board_meetings m
         WHERE m.status = 'published' AND m.cancelled_at IS NULL AND m.dining_price_pence > 0
           AND m.meeting_date >= (now() AT TIME ZONE 'Europe/London')::date
         ORDER BY m.meeting_date ASC LIMIT 1),
      (SELECT m.dining_price_pence FROM public.festive_board_meetings m
         WHERE m.status IN ('published','completed') AND m.cancelled_at IS NULL AND m.dining_price_pence > 0
           AND m.meeting_date < (now() AT TIME ZONE 'Europe/London')::date
         ORDER BY m.meeting_date DESC LIMIT 1)),
    (SELECT f.ugle_registration_fee_pence FROM public.lodge_fee_settings f WHERE f.unit_id = public.current_unit_id())
$function$

CREATE OR REPLACE FUNCTION public.get_lodge_identity()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _u text := public.current_unit_id(); _r jsonb;
BEGIN
  IF NOT public.is_active_member(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'unit_id', _u,
    'lodge_name', COALESCE(NULLIF(trim(t.lodge_name), ''), c.sender_name),
    'lodge_number', COALESCE(NULLIF(trim(r.unit_number), ''), NULLIF(trim(t.lodge_number), '')),
    'consecration_date', COALESCE(r.consecration_date::text, t.consecration_date::text),
    'secretary_email', c.secretary_email,
    'email_domain', NULLIF(split_part(COALESCE(c.secretary_email, ''), '@', 2), '')
  ) INTO _r
  FROM (SELECT 1) one
  LEFT JOIN LATERAL (SELECT * FROM public.lodge_template ORDER BY updated_at DESC NULLS LAST LIMIT 1) t ON true
  LEFT JOIN public.installation_rule_settings r ON r.unit_id = _u
  LEFT JOIN public.lodge_contact_settings c ON c.unit_id = _u;
  RETURN _r;
END $function$

CREATE OR REPLACE FUNCTION public.get_meeting_pattern()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH u AS (SELECT public.current_unit_id() AS id)
  SELECT jsonb_build_object(
    'schedule', COALESCE((SELECT s.schedule FROM public.meeting_series s, u
                          WHERE s.unit_id = u.id AND s.active AND jsonb_typeof(s.schedule) = 'array' AND jsonb_array_length(s.schedule) > 0
                          ORDER BY s.created_at LIMIT 1), '[]'::jsonb),
    'manual_text', (SELECT t.regular_meeting_pattern FROM public.lodge_template t ORDER BY t.updated_at DESC NULLS LAST LIMIT 1),
    'manual_override', COALESCE((SELECT us.value = 'true'::jsonb FROM public.unit_settings us, u
                                 WHERE us.unit_id = u.id AND us.key = 'meeting_pattern_manual_override'), false),
    'installation', (SELECT jsonb_build_object('month', r.installation_month, 'ordinal', r.installation_ordinal, 'weekday', r.installation_weekday, 'mode', r.mode, 'fixed_day', r.fixed_day)
                     FROM public.installation_rule_settings r, u WHERE r.unit_id = u.id LIMIT 1)
  )
$function$

CREATE OR REPLACE FUNCTION public.get_public_lodge_figures()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$

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
$function$

*/
-- DROP FUNCTION public.get_join_us_costs(text); DROP FUNCTION public.get_lodge_identity(text);
-- DROP FUNCTION public.get_meeting_pattern(text); DROP FUNCTION public.get_public_lodge_figures(text);
-- DROP FUNCTION public.get_public_unit_profile(text);
-- then run the five CREATE statements above and:
-- GRANT EXECUTE ON FUNCTION public.get_join_us_costs() TO PUBLIC, anon, authenticated, service_role;
-- REVOKE ALL ON FUNCTION public.get_lodge_identity(), public.get_meeting_pattern(), public.get_public_lodge_figures(), public.get_public_unit_profile() FROM PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.get_lodge_identity(), public.get_meeting_pattern(), public.get_public_lodge_figures(), public.get_public_unit_profile() TO anon, authenticated, service_role;
