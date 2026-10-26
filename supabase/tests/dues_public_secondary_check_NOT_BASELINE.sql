-- JOB CS: dues/public fingerprint (reconstructed; the CQ-era script was never saved, so this
-- is a NEW baseline, not comparable to a913a47c...). Read-only; ends with RAISE.
-- Covers: dues_calculate_amount for every profile for lodge years 2024-2027,
-- subscription_exempt_member_ids per year, the public Officers page and public booking details.
DO $$
DECLARE s text := ''; y int; r record;
BEGIN
  PERFORM set_config('request.jwt.claims', '', true);
  FOR y IN 2024..2027 LOOP
    FOR r IN SELECT id FROM public.profiles ORDER BY id LOOP
      s := s || 'D|' || y || '|' || r.id || '|' || coalesce(public.dues_calculate_amount(r.id, y)::text, 'null') || E'\n';
    END LOOP;
    s := s || 'X|' || y || '|' || coalesce((SELECT string_agg(m::text, ',' ORDER BY m) FROM public.subscription_exempt_member_ids(y) m), '-') || E'\n';
  END LOOP;
  y := public.get_officers_public_year();
  s := s || 'PY|' || coalesce(y::text, '-') || E'\n';
  s := s || 'PO|' || coalesce((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.position_key) FROM public.get_officers_public(y) o)::text, '[]') || E'\n';
  s := s || 'PB|' || coalesce(public.get_public_booking_details()::text, 'null') || E'\n';
  RAISE EXCEPTION 'DUESPUBLIC md5=% lines=%', md5(s), (length(s) - length(replace(s, E'\n', '')));
END $$;
