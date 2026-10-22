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
    -- Blank or null booking contact = not set: fall back to the Assistant Secretary's lodge address.
    'contact_email', COALESCE(NULLIF(trim((SELECT value->>'email' FROM s WHERE key='booking_contact_email')),''),
       NULLIF(trim((SELECT assistant_secretary_email FROM public.lodge_contact_settings WHERE unit_id = (SELECT id FROM u))),''))
  )
$$;
REVOKE ALL ON FUNCTION public.get_public_booking_details() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booking_details() TO anon, authenticated, service_role;