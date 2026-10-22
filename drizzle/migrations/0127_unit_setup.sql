CREATE TABLE public.unit_settings_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id text NOT NULL,
  key text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.unit_settings_audit TO authenticated;
GRANT ALL ON public.unit_settings_audit TO service_role;
ALTER TABLE public.unit_settings_audit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_edit_unit_setup(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user IS NOT NULL AND public.is_active_member(_user) AND (
    public.has_role(_user, 'admin') OR public.is_lodge_secretary(_user) OR public.is_current_officer(_user, 'treasurer'))
$$;
CREATE OR REPLACE FUNCTION public.can_view_unit_setup(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_edit_unit_setup(_user) OR (_user IS NOT NULL AND public.is_active_member(_user) AND (
    public.has_role(_user, 'worshipful_master') OR public.has_role(_user, 'assistant_secretary')
    OR public.is_current_officer(_user, 'worshipful_master') OR public.is_current_officer(_user, 'assistant_secretary')))
$$;
REVOKE ALL ON FUNCTION public.can_edit_unit_setup(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_unit_setup(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_edit_unit_setup(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_unit_setup(uuid) TO authenticated, service_role;

CREATE POLICY "Unit setup viewers read own unit audit" ON public.unit_settings_audit FOR SELECT TO authenticated
  USING (public.can_view_unit_setup(auth.uid()) AND unit_id = public.current_unit_id());

-- Validated, audited write of one Unit Setup key.
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
REVOKE ALL ON FUNCTION public.save_unit_setup(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_unit_setup(text, jsonb) TO authenticated;

-- Public-safe details for the booking form and its confirmation (signed-out visitors).
CREATE OR REPLACE FUNCTION public.get_public_booking_details()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (SELECT public.current_unit_id() AS id),
  t AS (SELECT * FROM public.lodge_template ORDER BY updated_at DESC NULLS LAST LIMIT 1),
  s AS (SELECT key, value FROM public.unit_settings, u WHERE unit_id = u.id AND key IN ('bank_details','payment_wording','sign_off','booking_contact_email'))
  SELECT jsonb_build_object(
    'lodge_name', (SELECT COALESCE(NULLIF(trim(t.lodge_name),''), c.sender_name) FROM (SELECT 1) o LEFT JOIN t ON true LEFT JOIN public.lodge_contact_settings c ON c.unit_id = (SELECT id FROM u)),
    'lodge_number', (SELECT COALESCE(NULLIF(trim(r.unit_number),''), NULLIF(trim(t.lodge_number),'')) FROM (SELECT 1) o LEFT JOIN t ON true LEFT JOIN public.installation_rule_settings r ON r.unit_id = (SELECT id FROM u)),
    'account_name', (SELECT value->>'account_name' FROM s WHERE key='bank_details'),
    'sort_code', (SELECT value->>'sort_code' FROM s WHERE key='bank_details'),
    'account_number', (SELECT value->>'account_number' FROM s WHERE key='bank_details'),
    'reference_pattern', (SELECT value->>'reference_pattern' FROM s WHERE key='bank_details'),
    'card_wording', (SELECT value->>'card_wording' FROM s WHERE key='payment_wording'),
    'cheque_payee', (SELECT value->>'cheque_payee' FROM s WHERE key='payment_wording'),
    'sign_off_override', (SELECT value->>'override' FROM s WHERE key='sign_off'),
    'contact_email', COALESCE((SELECT value->>'email' FROM s WHERE key='booking_contact_email'),
       (SELECT assistant_secretary_email FROM public.lodge_contact_settings WHERE unit_id = (SELECT id FROM u)))
  )
$$;
REVOKE ALL ON FUNCTION public.get_public_booking_details() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booking_details() TO anon, authenticated, service_role;

-- Seed CURRENT values for the sole existing unit as data (no-op if already set or no single unit).
INSERT INTO public.unit_settings(unit_id, key, value)
SELECT u.id, v.key, v.value FROM (SELECT min(id) AS id FROM public.units HAVING count(*) = 1) u
CROSS JOIN (VALUES
  ('bank_details', '{"account_name":"Weybridge Lodge No 6787","sort_code":"30-99-80","account_number":"14878862","reference_pattern":"Dining + {surname}"}'::jsonb),
  ('payment_wording', '{"card_wording":"","cheque_payee":"Weybridge Lodge No 6787"}'::jsonb),
  ('sign_off', '{"override":null}'::jsonb)
) v(key, value)
ON CONFLICT (unit_id, key) DO NOTHING;