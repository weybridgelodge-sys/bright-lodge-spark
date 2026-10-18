ALTER TABLE public.lodge_contact_settings
  ADD COLUMN IF NOT EXISTS site_url text,
  ADD COLUMN IF NOT EXISTS sender_name text,
  ADD COLUMN IF NOT EXISTS formal_sender_name text,
  ADD COLUMN IF NOT EXISTS assistant_secretary_email text,
  ADD COLUMN IF NOT EXISTS webmaster_email text,
  ADD COLUMN IF NOT EXISTS communications_email text;

UPDATE public.lodge_contact_settings SET
  site_url = COALESCE(site_url, 'https://weybridgelodge.org.uk'),
  sender_name = COALESCE(sender_name, 'Weybridge Lodge'),
  formal_sender_name = COALESCE(formal_sender_name, 'Weybridge Lodge No. 6787'),
  assistant_secretary_email = COALESCE(assistant_secretary_email, 'assistantsecretary@weybridgelodge.org.uk'),
  webmaster_email = COALESCE(webmaster_email, 'webmaster@weybridgelodge.org.uk'),
  communications_email = COALESCE(communications_email, 'communications@weybridgelodge.org.uk')
WHERE unit_id = 'weybridge';

CREATE OR REPLACE FUNCTION public.get_lodge_contact_settings(_unit_id text DEFAULT 'weybridge')
RETURNS TABLE(secretary_email text, membership_cc_email text, guide_url text, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_lodge_secretary(auth.uid())) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT s.secretary_email, s.membership_cc_email, s.guide_url, s.updated_at
    FROM public.lodge_contact_settings s WHERE s.unit_id = _unit_id;
END $$;

CREATE OR REPLACE FUNCTION public.update_lodge_contact_settings(
  _secretary_email text, _membership_cc_email text, _guide_url text, _unit_id text DEFAULT 'weybridge')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE email_re text := '^[^@\s]+@[^@\s]+\.[^@\s]+$';
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_lodge_secretary(auth.uid())) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
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
END $$;

REVOKE ALL ON FUNCTION public.get_lodge_contact_settings(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_lodge_contact_settings(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lodge_contact_settings(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_lodge_contact_settings(text, text, text, text) TO authenticated;

-- Masonic year of the officers the public page shows: the lodge_year of the
-- Worshipful Master appointment currently in effect (same rule as
-- current_officer_holder), so the label can never run ahead of the names.
CREATE OR REPLACE FUNCTION public.get_officers_public_year()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT oa.lodge_year
  FROM public.officer_appointments oa
  LEFT JOIN public.officer_positions op ON op.key = oa.position_key
  WHERE oa.position_key = 'worshipful_master' AND NOT oa.is_projection AND oa.member_id IS NOT NULL
    AND public.officer_appointment_effective(oa.lodge_year, oa.appointed_on, COALESCE(op.is_progressive, false))
        <= (now() AT TIME ZONE 'Europe/London')::date
  ORDER BY oa.lodge_year DESC, oa.updated_at DESC
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_officers_public_year() TO anon, authenticated;

-- Join Us cost figures only: current annual dues and the dining price of the
-- next published meeting (else the latest published/completed one).
CREATE OR REPLACE FUNCTION public.get_join_us_costs()
RETURNS TABLE(annual_dues_pence integer, dining_price_pence integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT d.annual_amount_pence FROM public.dues_settings d
       WHERE d.effective_lodge_year <= public.current_lodge_year()
       ORDER BY d.effective_lodge_year DESC, d.created_at DESC LIMIT 1),
    COALESCE(
      (SELECT m.dining_price_pence FROM public.festive_board_meetings m
         WHERE m.status = 'published' AND m.dining_price_pence > 0
           AND m.meeting_date >= (now() AT TIME ZONE 'Europe/London')::date
         ORDER BY m.meeting_date ASC LIMIT 1),
      (SELECT m.dining_price_pence FROM public.festive_board_meetings m
         WHERE m.status IN ('published','completed') AND m.dining_price_pence > 0
           AND m.meeting_date < (now() AT TIME ZONE 'Europe/London')::date
         ORDER BY m.meeting_date DESC LIMIT 1))
$$;
GRANT EXECUTE ON FUNCTION public.get_join_us_costs() TO anon, authenticated;