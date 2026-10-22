-- Remove the typed-in unit default from lodge helpers: an omitted unit now means the caller's unit (current_unit_id()).
CREATE OR REPLACE FUNCTION public.get_lodge_contact_settings(_unit_id text DEFAULT NULL)
 RETURNS TABLE(secretary_email text, membership_cc_email text, guide_url text, updated_at timestamp with time zone)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_lodge_secretary(auth.uid())) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  _unit_id := COALESCE(_unit_id, public.current_unit_id());
  RETURN QUERY SELECT s.secretary_email, s.membership_cc_email, s.guide_url, s.updated_at
    FROM public.lodge_contact_settings s WHERE s.unit_id = _unit_id;
END $function$;

CREATE OR REPLACE FUNCTION public.update_lodge_contact_settings(_secretary_email text, _membership_cc_email text, _guide_url text, _unit_id text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE email_re text := '^[^@\s]+@[^@\s]+\.[^@\s]+$';
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_lodge_secretary(auth.uid())) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  _unit_id := COALESCE(_unit_id, public.current_unit_id());
  IF _unit_id IS NULL THEN RAISE EXCEPTION 'No lodge for this account' USING ERRCODE = '22023'; END IF;
  _secretary_email := btrim(_secretary_email);
  _membership_cc_email := btrim(_membership_cc_email);
  _guide_url := btrim(_guide_url);
  IF _secretary_email IS NULL OR length(_secretary_email) > 255 OR _secretary_email !~ email_re THEN
    RAISE EXCEPTION 'Secretary email is not a valid email address' USING ERRCODE = '22023';
  END IF;
  IF _membership_cc_email IS NULL OR length(_membership_cc_email) > 255 OR _membership_cc_email !~ email_re THEN
    RAISE EXCEPTION 'Membership copy email is not a valid email address' USING ERRCODE = '22023';
  END IF;
  IF _guide_url IS NULL OR length(_guide_url) > 500 OR _guide_url !~ '^https://[^\s/]+\.[^\s]+$' THEN
    RAISE EXCEPTION 'Guide link must start with https://' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.lodge_contact_settings AS s (unit_id, secretary_email, membership_cc_email, guide_url, updated_at, updated_by)
  VALUES (_unit_id, _secretary_email, _membership_cc_email, _guide_url, now(), auth.uid())
  ON CONFLICT (unit_id) DO UPDATE SET secretary_email = EXCLUDED.secretary_email,
    membership_cc_email = EXCLUDED.membership_cc_email, guide_url = EXCLUDED.guide_url,
    updated_at = now(), updated_by = auth.uid();
END $function$;

CREATE OR REPLACE FUNCTION public.get_lodge_fee_settings(_unit_id text DEFAULT NULL)
 RETURNS TABLE(ugle_registration_fee_pence integer, pgl_registration_fee_pence integer, under_25_discount_percent integer, updated_at timestamp with time zone, updated_by_name text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_edit_lodge_fees(auth.uid()) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
  _unit_id := COALESCE(_unit_id, public.current_unit_id());
  RETURN QUERY SELECT f.ugle_registration_fee_pence, f.pgl_registration_fee_pence, f.under_25_discount_percent, f.updated_at,
    (SELECT COALESCE(NULLIF(p.full_name,''), trim(concat_ws(' ', p.first_name, p.last_name))) FROM public.profiles p WHERE p.id = f.updated_by)
  FROM public.lodge_fee_settings f WHERE f.unit_id = _unit_id;
END $function$;

CREATE OR REPLACE FUNCTION public.update_lodge_fee_settings(_ugle_pence integer, _pgl_pence integer, _discount_percent integer, _unit_id text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_edit_lodge_fees(auth.uid()) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
  _unit_id := COALESCE(_unit_id, public.current_unit_id());
  IF _unit_id IS NULL THEN RAISE EXCEPTION 'No lodge for this account' USING ERRCODE = '22023'; END IF;
  IF _ugle_pence IS NULL OR _ugle_pence <= 0 OR _pgl_pence IS NULL OR _pgl_pence <= 0 THEN RAISE EXCEPTION 'Fees must be positive'; END IF;
  IF _discount_percent IS NULL OR _discount_percent < 0 OR _discount_percent > 100 THEN RAISE EXCEPTION 'Discount must be 0 to 100'; END IF;
  INSERT INTO public.lodge_fee_settings (unit_id, ugle_registration_fee_pence, pgl_registration_fee_pence, under_25_discount_percent, updated_at, updated_by)
  VALUES (_unit_id, _ugle_pence, _pgl_pence, _discount_percent, now(), auth.uid())
  ON CONFLICT (unit_id) DO UPDATE SET ugle_registration_fee_pence = EXCLUDED.ugle_registration_fee_pence,
    pgl_registration_fee_pence = EXCLUDED.pgl_registration_fee_pence, under_25_discount_percent = EXCLUDED.under_25_discount_percent,
    updated_at = now(), updated_by = auth.uid();
END $function$;

CREATE OR REPLACE FUNCTION public.get_newsletter_subscriber_counts(_unit_id text DEFAULT NULL)
 RETURNS TABLE(confirmed_active integer, pending_confirmation integer)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_edit_newsletter(auth.uid()) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  _unit_id := COALESCE(_unit_id, public.current_unit_id());
  RETURN QUERY SELECT
    count(*) FILTER (WHERE s.confirmed AND s.unsubscribed_at IS NULL)::int,
    count(*) FILTER (WHERE NOT s.confirmed AND s.unsubscribed_at IS NULL)::int
  FROM public.newsletter_subscribers s WHERE s.unit_id = _unit_id;
END $function$;

CREATE OR REPLACE FUNCTION public.get_join_us_costs()
 RETURNS TABLE(annual_dues_pence integer, dining_price_pence integer, ugle_fee_pence integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
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
$function$;