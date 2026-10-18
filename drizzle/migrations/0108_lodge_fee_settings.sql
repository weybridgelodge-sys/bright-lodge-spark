CREATE TABLE public.lodge_fee_settings (
  unit_id text PRIMARY KEY DEFAULT 'weybridge',
  ugle_registration_fee_pence integer NOT NULL CHECK (ugle_registration_fee_pence > 0),
  pgl_registration_fee_pence integer NOT NULL CHECK (pgl_registration_fee_pence > 0),
  under_25_discount_percent integer NOT NULL DEFAULT 50 CHECK (under_25_discount_percent BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT ALL ON public.lodge_fee_settings TO service_role;
ALTER TABLE public.lodge_fee_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.lodge_fee_settings (unit_id, ugle_registration_fee_pence, pgl_registration_fee_pence, under_25_discount_percent)
VALUES ('weybridge', 13200, 1512, 50);

CREATE OR REPLACE FUNCTION public.can_edit_lodge_fees(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (public.has_role(_uid, 'admin') OR public.is_current_officer(_uid, 'treasurer'))
$$;

CREATE OR REPLACE FUNCTION public.get_lodge_fee_settings(_unit_id text DEFAULT 'weybridge')
RETURNS TABLE(ugle_registration_fee_pence integer, pgl_registration_fee_pence integer, under_25_discount_percent integer, updated_at timestamptz, updated_by_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_edit_lodge_fees(auth.uid()) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT f.ugle_registration_fee_pence, f.pgl_registration_fee_pence, f.under_25_discount_percent, f.updated_at,
    (SELECT COALESCE(NULLIF(p.full_name,''), trim(concat_ws(' ', p.first_name, p.last_name))) FROM public.profiles p WHERE p.id = f.updated_by)
  FROM public.lodge_fee_settings f WHERE f.unit_id = _unit_id;
END $$;

CREATE OR REPLACE FUNCTION public.update_lodge_fee_settings(_ugle_pence integer, _pgl_pence integer, _discount_percent integer, _unit_id text DEFAULT 'weybridge')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_edit_lodge_fees(auth.uid()) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
  IF _ugle_pence IS NULL OR _ugle_pence <= 0 OR _pgl_pence IS NULL OR _pgl_pence <= 0 THEN RAISE EXCEPTION 'Fees must be positive'; END IF;
  IF _discount_percent IS NULL OR _discount_percent < 0 OR _discount_percent > 100 THEN RAISE EXCEPTION 'Discount must be 0 to 100'; END IF;
  INSERT INTO public.lodge_fee_settings (unit_id, ugle_registration_fee_pence, pgl_registration_fee_pence, under_25_discount_percent, updated_at, updated_by)
  VALUES (_unit_id, _ugle_pence, _pgl_pence, _discount_percent, now(), auth.uid())
  ON CONFLICT (unit_id) DO UPDATE SET ugle_registration_fee_pence = EXCLUDED.ugle_registration_fee_pence,
    pgl_registration_fee_pence = EXCLUDED.pgl_registration_fee_pence, under_25_discount_percent = EXCLUDED.under_25_discount_percent,
    updated_at = now(), updated_by = auth.uid();
END $$;

REVOKE ALL ON FUNCTION public.get_lodge_fee_settings(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_lodge_fee_settings(integer, integer, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_lodge_fees(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lodge_fee_settings(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_lodge_fee_settings(integer, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_lodge_fees(uuid) TO authenticated;

DROP FUNCTION public.get_join_us_costs();
CREATE FUNCTION public.get_join_us_costs()
RETURNS TABLE(annual_dues_pence integer, dining_price_pence integer, ugle_fee_pence integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
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
    (SELECT f.ugle_registration_fee_pence FROM public.lodge_fee_settings f WHERE f.unit_id = 'weybridge')
$function$;
GRANT EXECUTE ON FUNCTION public.get_join_us_costs() TO anon, authenticated;