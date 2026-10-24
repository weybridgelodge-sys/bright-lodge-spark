-- Job BB: summons cover award images as a Unit Setup setting (blank = no image), seeded with today's files.
INSERT INTO public.unit_settings(unit_id, key, value, updated_at)
SELECT u.id, 'summons_cover_images', jsonb_build_object(
  'left_url', '/__l5e/assets-v1/f22695d7-afc6-46a8-9daf-9564690178fc/TLC-Patron-Pin.jpg',
  'right_url', '/__l5e/assets-v1/be3d0b35-5888-4ffa-b6b4-c7dfe04cc8f3/Festival_Gold_Award.png'), now()
FROM public.units u
ON CONFLICT (unit_id, key) DO NOTHING;

-- New template rows only: no typed lodge number / province. Existing rows unchanged.
ALTER TABLE public.lodge_template ALTER COLUMN lodge_number SET DEFAULT '';
ALTER TABLE public.lodge_template ALTER COLUMN province SET DEFAULT '';

CREATE OR REPLACE FUNCTION public.save_unit_setup(_key text, _value jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _u text := public.current_unit_id(); _old jsonb; _new jsonb; _sc text; _an text; _cur jsonb; _in jsonb := coalesce(_value, '{}'::jsonb);
BEGIN
  IF NOT public.can_edit_unit_setup(auth.uid()) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
  IF _u IS NULL THEN RAISE EXCEPTION 'No unit'; END IF;
  IF _key = 'contacts' THEN
    SELECT jsonb_build_object('assistant_secretary_email', assistant_secretary_email, 'webmaster_email', webmaster_email, 'communications_email', communications_email, 'site_url', site_url, 'sender_name', sender_name, 'formal_sender_name', formal_sender_name)
      INTO _cur FROM public.lodge_contact_settings WHERE unit_id = _u;
    _value := coalesce(jsonb_strip_nulls(_cur), '{}'::jsonb) || _in;
  ELSIF _key <> 'identity' THEN
    SELECT value INTO _cur FROM public.unit_settings WHERE unit_id = _u AND key = _key;
    _value := coalesce(_cur, '{}'::jsonb) || _in;
  END IF;
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
    IF _in ? 'cheque_payee' AND length(trim(coalesce(_in->>'cheque_payee',''))) = 0 THEN RAISE EXCEPTION 'Cheque payee is required' USING ERRCODE = '22023'; END IF;
    _new := jsonb_build_object('card_wording', trim(coalesce(_value->>'card_wording','')), 'cheque_payee', trim(coalesce(_value->>'cheque_payee','')));
  ELSIF _key = 'sign_off' THEN
    _new := jsonb_build_object('override', NULLIF(trim(coalesce(_value->>'override','')), ''));
  ELSIF _key = 'booking_contact_email' THEN
    IF coalesce(_value->>'email','') <> '' AND (_value->>'email') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Enter a valid email address' USING ERRCODE = '22023'; END IF;
    _new := jsonb_build_object('email', NULLIF(trim(coalesce(_value->>'email','')), ''));
  ELSIF _key = 'membership_officer_email' THEN
    IF coalesce(trim(_value->>'email'),'') <> '' AND lower(trim(_value->>'email')) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Enter a valid email address' USING ERRCODE = '22023'; END IF;
    _new := jsonb_build_object('email', NULLIF(lower(trim(coalesce(_value->>'email',''))), ''));
  ELSIF _key = 'crest_image' THEN
    IF coalesce(trim(_value->>'url'),'') <> '' AND trim(_value->>'url') !~ '^https://[^\s]+$' THEN RAISE EXCEPTION 'Enter a public https:// image address' USING ERRCODE = '22023'; END IF;
    _new := jsonb_build_object('url', NULLIF(trim(coalesce(_value->>'url','')), ''));
  ELSIF _key = 'summons_cover_images' THEN
    IF coalesce(trim(_value->>'left_url'),'') !~ '^(https://[^\s]+|/[^\s]+)?$' OR coalesce(trim(_value->>'right_url'),'') !~ '^(https://[^\s]+|/[^\s]+)?$' THEN
      RAISE EXCEPTION 'Enter a public https:// image address' USING ERRCODE = '22023'; END IF;
    _new := jsonb_build_object('left_url', NULLIF(trim(coalesce(_value->>'left_url','')), ''), 'right_url', NULLIF(trim(coalesce(_value->>'right_url','')), ''));
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
    IF _old IS DISTINCT FROM _new THEN
      INSERT INTO public.unit_settings_audit(unit_id, key, old_value, new_value, changed_by) VALUES (_u, 'identity', _old, _new, auth.uid());
    END IF;
    RETURN _new;
  ELSIF _key = 'web_social' THEN
    IF EXISTS (SELECT 1 FROM jsonb_each_text(_value) e WHERE e.key IN ('facebook_url','instagram_url','twitter_url') AND e.value <> '' AND e.value !~ '^https://[^\s/]+\.[^\s]+$') THEN
      RAISE EXCEPTION 'Links must start with https://' USING ERRCODE = '22023'; END IF;
    _new := jsonb_build_object('facebook_url', NULLIF(trim(coalesce(_value->>'facebook_url','')),''), 'instagram_url', NULLIF(trim(coalesce(_value->>'instagram_url','')),''), 'twitter_url', NULLIF(trim(coalesce(_value->>'twitter_url','')),''));
  ELSIF _key = 'province' THEN
    IF length(trim(coalesce(_value->>'name',''))) = 0 THEN RAISE EXCEPTION 'Province name is required' USING ERRCODE = '22023'; END IF;
    -- Return destinations: admin / Secretary only; both required and valid once either is sent.
    IF (_in ? 'provincial_return_email' OR _in ? 'installation_return_email') THEN
      IF NOT public.can_edit_province_emails(auth.uid()) THEN RAISE EXCEPTION 'Only the Secretary or an administrator can change the return email addresses' USING ERRCODE = '42501'; END IF;
      IF coalesce(trim(_value->>'provincial_return_email'),'') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR coalesce(trim(_value->>'installation_return_email'),'') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
        RAISE EXCEPTION 'Both return email addresses are required and must be valid' USING ERRCODE = '22023'; END IF;
    END IF;
    _new := jsonb_build_object('name', trim(_value->>'name'));
    IF _value ? 'provincial_return_email' THEN _new := _new || jsonb_build_object('provincial_return_email', lower(trim(_value->>'provincial_return_email'))); END IF;
    IF _value ? 'installation_return_email' THEN _new := _new || jsonb_build_object('installation_return_email', lower(trim(_value->>'installation_return_email'))); END IF;
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
END $function$;