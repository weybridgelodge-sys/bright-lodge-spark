ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS display_lines jsonb;
COMMENT ON COLUMN public.venues.display_lines IS 'Public address lines as printed on the website (shared venue fact, not unit-owned)';

CREATE OR REPLACE FUNCTION public.save_unit_setup(_key text, _value jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u text := public.current_unit_id(); _old jsonb; _new jsonb; _sc text; _an text;
BEGIN
  IF NOT public.can_edit_unit_setup(auth.uid()) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
  IF _u IS NULL THEN RAISE EXCEPTION 'No unit'; END IF;
  IF _key = 'bank_details' THEN
    _sc := regexp_replace(coalesce(_value->>'sort_code',''), '[\s-]', '', 'g');
    _an := regexp_replace(coalesce(_value->>'account_number',''), '\s', '', 'g');
    IF _sc !~ '^\d{6}$' THEN RAISE EXCEPTION 'Sort code must be 6 digits' USING ERRCODE = '22023'; END IF;
    IF _an !~ '^\d{8}$' THEN RAISE EXCEPTION 'Account number must be 8 digits' USING ERRCODE = '22023'; END IF;
    IF length(trim(coalesce(_value->>'account_name',''))) = 0 THEN RAISE EXCEPTION 'Account name is required' USING ERRCODE = '22023'; END IF;
    _new := jsonb_build_object('account_name', trim(_value->>'account_name'),
      'sort_code', substr(_sc,1,2)||'-'||substr(_sc,3,2)||'-'||substr(_sc,5,2),
      'account_number', _an, 'reference_pattern', trim(coalesce(_value->>'reference_pattern','')));
  ELSIF _key = 'payment_wording' THEN
    _new := jsonb_build_object('card_wording', trim(coalesce(_value->>'card_wording','')), 'cheque_payee', trim(coalesce(_value->>'cheque_payee','')));
  ELSIF _key = 'sign_off' THEN
    _new := jsonb_build_object('override', NULLIF(trim(coalesce(_value->>'override','')), ''));
  ELSIF _key = 'booking_contact_email' THEN
    IF coalesce(_value->>'email','') <> '' AND (_value->>'email') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Enter a valid email address' USING ERRCODE = '22023'; END IF;
    _new := jsonb_build_object('email', NULLIF(trim(coalesce(_value->>'email','')), ''));
  ELSIF _key = 'identity' THEN
    IF length(trim(coalesce(_value->>'lodge_name',''))) = 0 THEN RAISE EXCEPTION 'Lodge name is required' USING ERRCODE = '22023'; END IF;
    IF coalesce(_value->>'lodge_number','') !~ '^\d{1,6}$' THEN RAISE EXCEPTION 'Lodge number must be digits' USING ERRCODE = '22023'; END IF;
    SELECT jsonb_build_object('lodge_name', t.lodge_name, 'lodge_number', coalesce(r.unit_number, t.lodge_number), 'consecration_date', coalesce(r.consecration_date::text, t.consecration_date::text))
      INTO _old FROM (SELECT 1) one
      LEFT JOIN LATERAL (SELECT * FROM public.lodge_template ORDER BY updated_at DESC NULLS LAST LIMIT 1) t ON true
      LEFT JOIN public.installation_rule_settings r ON r.unit_id = _u;
    _new := jsonb_build_object('lodge_name', trim(_value->>'lodge_name'), 'lodge_number', trim(_value->>'lodge_number'), 'consecration_date', NULLIF(_value->>'consecration_date',''));
    UPDATE public.lodge_template SET lodge_name = _new->>'lodge_name', lodge_number = _new->>'lodge_number'
      WHERE id = (SELECT id FROM public.lodge_template ORDER BY updated_at DESC NULLS LAST LIMIT 1);
    UPDATE public.installation_rule_settings SET unit_number = _new->>'lodge_number', consecration_date = (_new->>'consecration_date')::date WHERE unit_id = _u;
    UPDATE public.units SET name = (_new->>'lodge_name') || ' No. ' || (_new->>'lodge_number') WHERE id = _u;
    INSERT INTO public.unit_settings_audit(unit_id, key, old_value, new_value, changed_by) VALUES (_u, 'identity', _old, _new, auth.uid());
    RETURN _new;
  ELSIF _key = 'web_social' THEN
    IF EXISTS (SELECT 1 FROM jsonb_each_text(_value) e WHERE e.key IN ('facebook_url','instagram_url','twitter_url') AND e.value <> '' AND e.value !~ '^https://[^\s/]+\.[^\s]+$') THEN
      RAISE EXCEPTION 'Links must start with https://' USING ERRCODE = '22023'; END IF;
    _new := jsonb_build_object('facebook_url', NULLIF(trim(coalesce(_value->>'facebook_url','')),''), 'instagram_url', NULLIF(trim(coalesce(_value->>'instagram_url','')),''), 'twitter_url', NULLIF(trim(coalesce(_value->>'twitter_url','')),''));
  ELSIF _key = 'province' THEN
    IF length(trim(coalesce(_value->>'name',''))) = 0 THEN RAISE EXCEPTION 'Province name is required' USING ERRCODE = '22023'; END IF;
    _new := jsonb_build_object('name', trim(_value->>'name'));
  ELSIF _key = 'registrations' THEN
    _new := jsonb_build_object('ico_number', NULLIF(trim(coalesce(_value->>'ico_number','')),''));
  ELSIF _key = 'meeting_place' THEN
    IF NOT EXISTS (SELECT 1 FROM public.venues WHERE id::text = (_value->>'venue_id')) THEN RAISE EXCEPTION 'Choose a venue' USING ERRCODE = '22023'; END IF;
    _new := jsonb_build_object('venue_id', _value->>'venue_id');
  ELSIF _key = 'newsletter' THEN
    _new := jsonb_build_object('masthead', NULLIF(trim(coalesce(_value->>'masthead','')),''), 'footer_note', NULLIF(trim(coalesce(_value->>'footer_note','')),''));
  ELSIF _key = 'calendar_feed' THEN
    _new := jsonb_build_object('name', NULLIF(trim(coalesce(_value->>'name','')),''));
  ELSIF _key = 'return_files' THEN
    IF coalesce(_value->>'provincial','') !~ '\{year\}' OR coalesce(_value->>'installation','') !~ '\{year\}' THEN
      RAISE EXCEPTION 'File names must include {year}' USING ERRCODE = '22023'; END IF;
    IF coalesce(_value->>'provincial','') ~ '[/\\]' OR coalesce(_value->>'installation','') ~ '[/\\]' THEN RAISE EXCEPTION 'File names cannot contain slashes' USING ERRCODE = '22023'; END IF;
    _new := jsonb_build_object('provincial', trim(_value->>'provincial'), 'installation', trim(_value->>'installation'));
  ELSIF _key = 'contacts' THEN
    IF EXISTS (SELECT 1 FROM jsonb_each_text(_value) e WHERE e.key LIKE '%_email' AND e.value !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
      RAISE EXCEPTION 'Enter valid email addresses' USING ERRCODE = '22023'; END IF;
    IF coalesce(_value->>'site_url','') !~ '^https://[^\s/]+\.[^\s]+$' THEN RAISE EXCEPTION 'Website must start with https://' USING ERRCODE = '22023'; END IF;
    SELECT jsonb_build_object('assistant_secretary_email', assistant_secretary_email, 'webmaster_email', webmaster_email, 'communications_email', communications_email, 'site_url', site_url, 'sender_name', sender_name, 'formal_sender_name', formal_sender_name)
      INTO _old FROM public.lodge_contact_settings WHERE unit_id = _u;
    _new := jsonb_build_object('assistant_secretary_email', trim(_value->>'assistant_secretary_email'), 'webmaster_email', trim(_value->>'webmaster_email'),
      'communications_email', trim(_value->>'communications_email'), 'site_url', regexp_replace(trim(_value->>'site_url'), '/+$', ''),
      'sender_name', trim(coalesce(_value->>'sender_name','')), 'formal_sender_name', trim(coalesce(_value->>'formal_sender_name','')));
    IF length(_new->>'sender_name') = 0 OR length(_new->>'formal_sender_name') = 0 THEN RAISE EXCEPTION 'Sender names are required' USING ERRCODE = '22023'; END IF;
    UPDATE public.lodge_contact_settings SET assistant_secretary_email = _new->>'assistant_secretary_email', webmaster_email = _new->>'webmaster_email',
      communications_email = _new->>'communications_email', site_url = _new->>'site_url', sender_name = _new->>'sender_name', formal_sender_name = _new->>'formal_sender_name',
      updated_by = auth.uid(), updated_at = now() WHERE unit_id = _u;
    IF _old IS DISTINCT FROM _new THEN
      INSERT INTO public.unit_settings_audit(unit_id, key, old_value, new_value, changed_by) VALUES (_u, 'contacts', _old, _new, auth.uid());
    END IF;
    RETURN _new;
  ELSE
    RAISE EXCEPTION 'Unknown setting' USING ERRCODE = '22023';
  END IF;
  SELECT value INTO _old FROM public.unit_settings WHERE unit_id = _u AND key = _key;
  INSERT INTO public.unit_settings(unit_id, key, value, updated_by, updated_at) VALUES (_u, _key, _new, auth.uid(), now())
    ON CONFLICT (unit_id, key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now();
  IF _old IS DISTINCT FROM _new THEN
    INSERT INTO public.unit_settings_audit(unit_id, key, old_value, new_value, changed_by) VALUES (_u, _key, _old, _new, auth.uid());
  END IF;
  RETURN _new;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_unit_profile()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (SELECT public.current_unit_id() AS id),
  t AS (SELECT * FROM public.lodge_template ORDER BY updated_at DESC NULLS LAST LIMIT 1),
  s AS (SELECT key, value FROM public.unit_settings, u WHERE unit_id = u.id AND key IN ('web_social','province','registrations','meeting_place')),
  r AS (SELECT r.* FROM public.installation_rule_settings r, u WHERE r.unit_id = u.id),
  v AS (SELECT v.* FROM public.venues v WHERE v.id::text = (SELECT value->>'venue_id' FROM s WHERE key = 'meeting_place'))
  SELECT jsonb_build_object(
    'lodge_name', (SELECT NULLIF(trim(lodge_name),'') FROM t),
    'lodge_number', COALESCE((SELECT NULLIF(trim(unit_number),'') FROM r), (SELECT NULLIF(trim(lodge_number),'') FROM t)),
    'consecration_year', left(COALESCE((SELECT consecration_date::text FROM r), (SELECT consecration_date::text FROM t)), 4),
    'province_name', (SELECT value->>'name' FROM s WHERE key='province'),
    'ico_number', (SELECT value->>'ico_number' FROM s WHERE key='registrations'),
    'facebook_url', (SELECT value->>'facebook_url' FROM s WHERE key='web_social'),
    'instagram_url', (SELECT value->>'instagram_url' FROM s WHERE key='web_social'),
    'twitter_url', (SELECT value->>'twitter_url' FROM s WHERE key='web_social'),
    'venue_name', (SELECT name FROM v),
    'venue_lines', (SELECT display_lines FROM v),
    'site_url', (SELECT c.site_url FROM public.lodge_contact_settings c, u WHERE c.unit_id = u.id)
  )
$$;
REVOKE ALL ON FUNCTION public.get_public_unit_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_unit_profile() TO anon, authenticated, service_role;

UPDATE public.venues SET display_lines = '["Guildford Masonic Centre, Weybourne House,","Hitherbury Close,","Guildford, Surrey GU2 4DR"]'::jsonb
  WHERE name = 'Guildford Masonic Centre' AND display_lines IS NULL;
INSERT INTO public.unit_settings(unit_id, key, value)
SELECT u.id, v.key, v.value FROM (SELECT min(id) AS id FROM public.units HAVING count(*) = 1) u
CROSS JOIN (VALUES
  ('web_social', '{"facebook_url":"https://facebook.com/people/Weybridge-Lodge-No-6787/61551808420513/","instagram_url":"https://instagram.com/weybridgelodge/","twitter_url":"https://twitter.com/weybridgelodge"}'::jsonb),
  ('province', '{"name":"Province of Surrey"}'::jsonb),
  ('registrations', '{"ico_number":"ZC194126"}'::jsonb),
  ('newsletter', '{"masthead":"Weybridge Lodge No. 6787","footer_note":"Guildford Masonic Centre, GU2 4DR"}'::jsonb),
  ('calendar_feed', '{"name":"Weybridge Lodge No. 6787"}'::jsonb),
  ('return_files', '{"provincial":"L6787-Provincial-Return-{year}","installation":"Installation-Return-6787-{year}"}'::jsonb)
) v(key, value)
ON CONFLICT (unit_id, key) DO NOTHING;
INSERT INTO public.unit_settings(unit_id, key, value)
SELECT u.id, 'meeting_place', jsonb_build_object('venue_id', (SELECT id::text FROM public.venues WHERE name = 'Guildford Masonic Centre' LIMIT 1))
FROM (SELECT min(id) AS id FROM public.units HAVING count(*) = 1) u
WHERE EXISTS (SELECT 1 FROM public.venues WHERE name = 'Guildford Masonic Centre')
ON CONFLICT (unit_id, key) DO NOTHING;