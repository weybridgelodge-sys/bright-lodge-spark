-- current_unit_id(): no typed-in unit. Signed-in member's unit, else the only unit when exactly one exists.
CREATE OR REPLACE FUNCTION public.current_unit_id()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT p.unit_id FROM public.profiles p WHERE p.id = auth.uid()),
    (SELECT min(u.id) FROM public.units u HAVING count(*) = 1)
  )
$$;

-- Public meeting pattern parts for the caller's unit (sentence is composed in the app by one shared rule).
CREATE OR REPLACE FUNCTION public.get_meeting_pattern()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
$$;
REVOKE ALL ON FUNCTION public.get_meeting_pattern() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_meeting_pattern() TO anon, authenticated, service_role;

-- Lodge identity for generated documents (active members only).
CREATE OR REPLACE FUNCTION public.get_lodge_identity()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
END $$;
REVOKE ALL ON FUNCTION public.get_lodge_identity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lodge_identity() TO authenticated, service_role;

COMMENT ON COLUMN public.lodge_template.lodge_representatives IS 'DEPRECATED: representatives are officer_appointments on officer_positions category representative; kept only as a non-member name fallback';
COMMENT ON COLUMN public.lodge_template.royal_arch_rep IS 'DEPRECATED: replaced by officer_appointments position rep_royal_arch; kept only as a non-member name fallback';
COMMENT ON COLUMN public.lodge_template.royal_arch_rep_member_id IS 'DEPRECATED: replaced by officer_appointments position rep_royal_arch';