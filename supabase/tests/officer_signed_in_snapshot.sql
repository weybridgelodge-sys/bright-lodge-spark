-- JOB CQ: signed-in comparison the anonymous snapshot cannot cover. Read-only; ends with RAISE.
-- Viewers simulated via request.jwt.claims: current Secretary, current WM, the member themselves,
-- and an ordinary member (lowest-id active profile holding no current office).
-- Covers get_member_offices_held for all 24 profiles per viewer, and is_current_officer +
-- current_office_label for every current officer. Must hash identically before and after.
DO $$
DECLARE s text := ''; v record; m record; sec uuid; wm uuid; ord uuid;
BEGIN
  sec := public.current_officer_holder('secretary', DATE '2026-10-26');
  wm  := public.current_officer_holder('worshipful_master', DATE '2026-10-26');
  SELECT p.id INTO ord FROM public.profiles p
   WHERE p.member_status = 'active'
     AND NOT EXISTS (SELECT 1 FROM public.officer_positions op WHERE public.current_officer_holder(op.key, DATE '2026-10-26') = p.id)
   ORDER BY p.id LIMIT 1;
  FOR v IN SELECT * FROM (VALUES ('secretary', sec), ('wm', wm), ('ordinary', ord)) x(role, id) LOOP
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v.id, 'role', 'authenticated')::text, true);
    FOR m IN SELECT id FROM public.profiles ORDER BY id LOOP
      s := s || 'OH|' || v.role || '|' || m.id || '|' || coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM public.get_member_offices_held(m.id) x)::text, '[]') || E'\n';
    END LOOP;
  END LOOP;
  FOR m IN SELECT id FROM public.profiles ORDER BY id LOOP
    PERFORM set_config('request.jwt.claims', json_build_object('sub', m.id, 'role', 'authenticated')::text, true);
    s := s || 'OH|self|' || m.id || '|' || coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM public.get_member_offices_held(m.id) x)::text, '[]') || E'\n';
  END LOOP;
  PERFORM set_config('request.jwt.claims', '', true);
  FOR m IN SELECT op.key, public.current_officer_holder(op.key, DATE '2026-10-26') AS holder
           FROM public.officer_positions op ORDER BY op.key LOOP
    CONTINUE WHEN m.holder IS NULL;
    s := s || 'IC|' || m.key || '|' || m.holder || '|' || coalesce(public.is_current_officer(m.holder, m.key)::text, 'null')
           || '|' || coalesce(public.current_office_label(m.holder), '-') || E'\n';
  END LOOP;
  RAISE EXCEPTION 'SIGNEDIN md5=% lines=% viewers sec=% wm=% ord=% %', md5(s),
    (length(s) - length(replace(s, E'\n', ''))), sec, wm, ord, E'\n' || s;
END $$;
