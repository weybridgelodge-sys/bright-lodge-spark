CREATE OR REPLACE FUNCTION public.get_public_booking_details()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH u AS (SELECT public.current_unit_id() AS id),
  t AS (SELECT * FROM public.lodge_template ORDER BY updated_at DESC NULLS LAST LIMIT 1),
  s AS (SELECT key, value FROM public.unit_settings, u WHERE unit_id = u.id AND key IN ('bank_details','payment_wording','sign_off','booking_contact_email')),
  c AS (SELECT NULLIF(trim((SELECT value->>'email' FROM s WHERE key='booking_contact_email')),'') AS explicit,
               CASE WHEN public.current_officer_holder('assistant_secretary') IS NOT NULL THEN NULLIF(trim(l.assistant_secretary_email),'') END AS asst,
               (public.current_officer_holder('assistant_secretary') IS NOT NULL) AS asst_held,
               NULLIF(trim(l.secretary_email),'') AS sec
        FROM (SELECT 1) o LEFT JOIN public.lodge_contact_settings l ON l.unit_id = (SELECT id FROM u))
  SELECT jsonb_build_object(
    'lodge_name', (SELECT COALESCE(NULLIF(trim(t.lodge_name),''), lc.sender_name) FROM (SELECT 1) o LEFT JOIN t ON true LEFT JOIN public.lodge_contact_settings lc ON lc.unit_id = (SELECT id FROM u)),
    'lodge_number', (SELECT COALESCE(NULLIF(trim(r.unit_number),''), NULLIF(trim(t.lodge_number),'')) FROM (SELECT 1) o LEFT JOIN t ON true LEFT JOIN public.installation_rule_settings r ON r.unit_id = (SELECT id FROM u)),
    'account_name', (SELECT value->>'account_name' FROM s WHERE key='bank_details'),
    'sort_code', (SELECT value->>'sort_code' FROM s WHERE key='bank_details'),
    'account_number', (SELECT value->>'account_number' FROM s WHERE key='bank_details'),
    'reference_pattern', (SELECT value->>'reference_pattern' FROM s WHERE key='bank_details'),
    'card_wording', (SELECT value->>'card_wording' FROM s WHERE key='payment_wording'),
    'cheque_payee', (SELECT value->>'cheque_payee' FROM s WHERE key='payment_wording'),
    'sign_off_override', (SELECT value->>'override' FROM s WHERE key='sign_off'),
    -- Booking contact: Unit Setup address, else Assistant Secretary (only if the office is held), else Secretary.
    'contact_email', (SELECT COALESCE(explicit, asst, sec) FROM c),
    'contact_office', (SELECT CASE WHEN explicit IS NOT NULL THEN '' WHEN asst IS NOT NULL THEN 'Assistant Secretary' ELSE 'Secretary' END FROM c)
  )
$function$;