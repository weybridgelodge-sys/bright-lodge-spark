-- JOB CQ (+ CP) two-lodge harness. Re-runnable; everything happens in one DO block that ends
-- with RAISE EXCEPTION, so every change (temporary second lodge, moved profiles, test rows,
-- disabled trigger) is rolled back. Output: one PASS/FAIL line per check.
DO $$
DECLARE
  u text := (SELECT id FROM public.units ORDER BY id LIMIT 1);
  u2 text := 'cq-test-lodge-2';
  d date := DATE '2026-10-26';
  wm uuid; sec uuid; tre uuid; alm uuid; x uuid; blank_user uuid; ap record; acc uuid;
  m1 uuid; m3 uuid; b record; ok boolean; out text := ''; fails int := 0;
BEGIN
  IF (SELECT count(*) FROM public.units) <> 1 THEN RAISE EXCEPTION 'harness expects exactly one real lodge'; END IF;
  wm  := public.current_officer_holder('worshipful_master', d, u);
  sec := public.current_officer_holder('secretary', d, u);
  tre := public.current_officer_holder('treasurer', d, u);
  alm := public.current_officer_holder('almoner', d, u);
  -- x: an active member who holds no current office in lodge A; becomes lodge B's Treasurer
  SELECT p.id INTO x FROM public.profiles p WHERE p.status = 'active'
     AND NOT EXISTS (SELECT 1 FROM public.officer_positions op WHERE public.current_officer_holder(op.key, d, u) = p.id)
   ORDER BY p.id LIMIT 1;
  SELECT p.id INTO blank_user FROM public.profiles p WHERE p.status = 'active' AND p.id NOT IN (x, wm, sec, tre, alm) ORDER BY p.id DESC LIMIT 1;

  INSERT INTO public.units (id, name) VALUES (u2, 'CQ Test Lodge 2');
  UPDATE public.profiles SET unit_id = u2 WHERE id = x;
  SELECT * INTO ap FROM public.officer_appointments WHERE unit_id = u AND position_key = 'treasurer' AND member_id = tre ORDER BY lodge_year DESC LIMIT 1;
  INSERT INTO public.officer_appointments (position_key, lodge_year, member_id, appointed_on, unit_id)
  VALUES ('treasurer', ap.lodge_year, x, ap.appointed_on, u2);

  -- 1. officer of A is not an officer of B; same office in two lodges -> right person each
  ok := public.is_current_officer(tre, 'treasurer') IS TRUE AND public.current_officer_holder('treasurer', d, u2) = x
        AND public.current_officer_holder('treasurer', d, u) = tre AND public.is_current_officer(x, 'treasurer') IS TRUE
        AND public.current_officer_holder('treasurer', d, u2) <> tre;
  out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || ' same office two lodges: right holder each; A officer not B officer' || E'\n'; fails := fails + (NOT ok)::int;
  ok := coalesce(public.is_current_officer(wm, 'worshipful_master'), false) AND public.current_officer_holder('worshipful_master', d, u2) IS NULL;
  out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || ' lodge A WM is not WM of lodge B' || E'\n'; fails := fails + (NOT ok)::int;

  -- 2. Weybridge WM, Secretary, Treasurer, Almoner still found (explicit lodge, and signed-in caller of lodge A)
  ok := wm IS NOT NULL AND sec IS NOT NULL AND tre IS NOT NULL AND alm IS NOT NULL
        AND public.is_current_officer(wm,'worshipful_master') AND public.is_current_officer(sec,'secretary')
        AND public.is_current_officer(tre,'treasurer') AND public.is_current_officer(alm,'almoner');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', sec, 'role', 'authenticated')::text, true);
  ok := ok AND public.current_officer_holder('worshipful_master', d) = wm AND public.current_officer_holder('treasurer', d) = tre
           AND public.current_officer_holder('almoner', d) = alm AND public.current_officer_holder('secretary', d) = sec;
  out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || ' lodge A WM/Secretary/Treasurer/Almoner found (explicit lodge and signed-in caller)' || E'\n'; fails := fails + (NOT ok)::int;
  -- signed-in caller of lodge B sees lodge B's Treasurer, not lodge A's
  PERFORM set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  ok := public.current_officer_holder('treasurer', d) = x AND public.current_officer_holder('worshipful_master', d) IS NULL;
  out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || ' signed-in lodge B caller gets lodge B holders only' || E'\n'; fails := fails + (NOT ok)::int;

  -- 3. signed-in caller with a blank lodge gets nothing
  ALTER TABLE public.profiles ALTER COLUMN unit_id DROP NOT NULL;
  UPDATE public.profiles SET unit_id = NULL WHERE id = blank_user;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', blank_user, 'role', 'authenticated')::text, true);
  ok := public.current_officer_holder('worshipful_master', d) IS NULL AND public.current_officer_holder('treasurer', d) IS NULL
        AND public.get_officers_public_year() IS NULL;
  out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || ' signed-in blank-lodge caller gets nothing' || E'\n'; fails := fails + (NOT ok)::int;

  -- 4. two lodges, no session: the temporary one-lodge fallback returns nothing
  PERFORM set_config('request.jwt.claims', '', true);
  ok := public.current_officer_holder('worshipful_master', d) IS NULL AND public.current_officer_holder('secretary', d) IS NULL
        AND public.officer_lookup_unit(NULL) IS NULL AND public.get_officers_public_year() IS NULL;
  out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || ' two lodges + no session: fallback returns nothing' || E'\n'; fails := fails + (NOT ok)::int;

  -- 5. blank-lodge appointment matches nothing
  ALTER TABLE public.officer_appointments DISABLE TRIGGER officer_appointments_fill_unit;
  INSERT INTO public.officer_appointments (position_key, lodge_year, member_id, appointed_on, unit_id)
  VALUES ('assistant_secretary', ap.lodge_year, blank_user, ap.appointed_on, NULL);
  ALTER TABLE public.officer_appointments ENABLE TRIGGER officer_appointments_fill_unit;
  ok := public.current_officer_holder('assistant_secretary', d, u) IS DISTINCT FROM blank_user
        AND public.current_officer_holder('assistant_secretary', d, u2) IS NULL
        AND coalesce(public.is_current_officer(blank_user, 'assistant_secretary'), false) = false;
  out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || ' blank-lodge appointment matches nothing' || E'\n'; fails := fails + (NOT ok)::int;

  -- 6. offices held: lodge B Treasurer's history shows only lodge B
  PERFORM set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  ok := (SELECT count(*) FROM public.get_member_offices_held(x) h WHERE h.position_key = 'treasurer') = 1;
  out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || ' offices held shows the member''s own lodge appointment' || E'\n'; fails := fails + (NOT ok)::int;
  PERFORM set_config('request.jwt.claims', '', true);

  -- 7 (Job CS). plain own-lodge member (no admin/Secretary/WM role) cannot insert, update or delete appointments
  DECLARE plain uuid; n int; ins_ok boolean := false; tgt uuid; before_member uuid;
  BEGIN
    SELECT p.id INTO plain FROM public.profiles p WHERE p.status = 'active' AND p.unit_id = u
       AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role IN ('admin','secretary','worshipful_master'))
       AND p.id NOT IN (x, blank_user) ORDER BY p.id LIMIT 1;
    SELECT id, member_id INTO tgt, before_member FROM public.officer_appointments WHERE unit_id = u ORDER BY id LIMIT 1;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', plain, 'role', 'authenticated')::text, true);
    PERFORM set_config('role', 'authenticated', true);
    BEGIN
      INSERT INTO public.officer_appointments (position_key, lodge_year, member_id, unit_id) VALUES ('steward', 2031, plain, u);
    EXCEPTION WHEN insufficient_privilege THEN ins_ok := true; END;
    UPDATE public.officer_appointments SET member_id = plain WHERE id = tgt; GET DIAGNOSTICS n = ROW_COUNT;
    ok := plain IS NOT NULL AND ins_ok AND n = 0;
    DELETE FROM public.officer_appointments WHERE id = tgt; GET DIAGNOSTICS n = ROW_COUNT;
    ok := ok AND n = 0;
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claims', '', true);
    ok := ok AND (SELECT member_id FROM public.officer_appointments WHERE id = tgt) IS NOT DISTINCT FROM before_member;
    out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || ' CS: plain own-lodge member cannot insert/update/delete appointments' || E'\n'; fails := fails + (NOT ok)::int;
  END;

  -- CP checks ---------------------------------------------------------------
  -- same office+year twice in one lodge refused
  ok := false;
  BEGIN INSERT INTO public.officer_appointments (position_key, lodge_year, member_id, unit_id) VALUES ('treasurer', ap.lodge_year, x, u2);
  EXCEPTION WHEN unique_violation THEN ok := true; END;
  out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || ' CP: same office+year twice in one lodge refused' || E'\n'; fails := fails + (NOT ok)::int;
  -- visitor email per lodge
  INSERT INTO public.festive_board_meetings (meeting_date, event_key, unit_id) VALUES ('2030-01-10','cq-test-1', u) RETURNING id INTO m1;
  INSERT INTO public.festive_board_meetings (meeting_date, event_key, unit_id) VALUES ('2030-01-12','cq-test-2', u2) RETURNING id INTO m3;
  INSERT INTO public.festive_board_attendance (meeting_id, visitor_name, email) VALUES (m1,'Cq Tester','cq.test@example.invalid');
  INSERT INTO public.festive_board_attendance (meeting_id, visitor_name, email) VALUES (m3,'Cq Tester','cq.test@example.invalid');
  INSERT INTO public.festive_board_attendance (meeting_id, visitor_name, email) VALUES (m3,'Cq Tester again','cq.test@example.invalid');
  ok := (SELECT count(*) FROM public.visitor_contacts WHERE email='cq.test@example.invalid') = 2
    AND (SELECT count(DISTINCT unit_id) FROM public.visitor_contacts WHERE email='cq.test@example.invalid') = 2;
  out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || ' CP: same visitor email allowed in two lodges, merged within one' || E'\n'; fails := fails + (NOT ok)::int;
  ok := false;
  BEGIN INSERT INTO public.visitor_contacts (email, unit_id) VALUES ('cq.test@example.invalid', u2);
  EXCEPTION WHEN unique_violation THEN ok := true; END;
  out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || ' CP: duplicate visitor email in one lodge refused' || E'\n'; fails := fails + (NOT ok)::int;
  -- booking forced to the account's lodge, including a service-role insert
  SELECT id INTO acc FROM public.event_accounts WHERE unit_id = u ORDER BY created_at LIMIT 1;
  INSERT INTO public.event_bookings (event_id, payer_name, unit_id) VALUES (acc, 'Cq Wrong', u2) RETURNING * INTO b;
  ok := b.unit_id = u;
  UPDATE public.event_bookings SET unit_id = u2 WHERE id = b.id RETURNING * INTO b;
  ok := ok AND b.unit_id = u;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  PERFORM set_config('role', 'service_role', true);
  INSERT INTO public.event_bookings (event_id, payer_name, unit_id) VALUES (acc, 'Cq Service', u2) RETURNING * INTO b;
  ok := ok AND b.unit_id = u;
  out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || ' CP: booking corrected to the account''s lodge (insert, update, service role)' || E'\n'; fails := fails + (NOT ok)::int;

  RAISE EXCEPTION 'HARNESS fails=% %', fails, E'\n' || out;
END $$;
