-- Dues/public fingerprint (BASELINE). Must give md5 a913a47c30b1ee10b37e7d3b444a74b7, 58 lines.
-- Ends with RAISE so nothing persists.
DO $$ DECLARE s text := ''; y int; r record; BEGIN
  FOR y IN 2020..2027 LOOP s := s || 'X|' || y || '|' || coalesce((SELECT string_agg(id::text, ',' ORDER BY id) FROM public.subscription_exempt_member_ids(y) id), '-') || E'\n'; END LOOP;
  FOR r IN SELECT id FROM public.profiles ORDER BY id LOOP FOR y IN 2025..2026 LOOP
    s := s || 'D|' || r.id || '|' || y || '|' || (public.dues_calculate_amount(r.id, y) - 'meetings_actual_in_year')::text || E'\n'; END LOOP; END LOOP;
  s := s || 'B|' || (public.get_public_booking_details() - 'account_number' - 'sort_code')::text || E'\n';
  s := s || 'Y|' || coalesce(public.get_officers_public_year()::text,'-') || E'\n';
  RAISE EXCEPTION 'DUES md5=% lines=%', md5(s), (length(s) - length(replace(s, E'\n', '')));
END $$;
