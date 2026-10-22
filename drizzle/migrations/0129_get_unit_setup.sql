CREATE OR REPLACE FUNCTION public.get_unit_setup()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _u text := public.current_unit_id();
BEGIN
  IF NOT public.can_view_unit_setup(auth.uid()) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'contacts', (SELECT jsonb_build_object('assistant_secretary_email', assistant_secretary_email, 'webmaster_email', webmaster_email,
        'communications_email', communications_email, 'site_url', site_url, 'sender_name', sender_name, 'formal_sender_name', formal_sender_name)
      FROM public.lodge_contact_settings WHERE unit_id = _u),
    'venues', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'address', address, 'display_lines', display_lines) ORDER BY name), '[]'::jsonb) FROM public.venues),
    'province_emails', jsonb_build_object(
      'provincial_return', (SELECT value FROM public.module_settings WHERE key = 'provincial_return_province_email'),
      'installation_return', (SELECT value FROM public.module_settings WHERE key = 'installation_return_province_email'))
  );
END $$;
REVOKE ALL ON FUNCTION public.get_unit_setup() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unit_setup() TO authenticated;