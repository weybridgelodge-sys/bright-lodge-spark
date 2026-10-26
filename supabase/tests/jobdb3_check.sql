-- JOB DB3 check (rolled back: ends with RAISE EXCEPTION). Second lodge 'zz_db3' is temporary.
DO $$
DECLARE
  admin_u uuid := 'de693c92-6f3d-49b6-afc3-406fc4c0acd9';
  member_u uuid := '40192a1a-1990-48a5-b360-f67ce5c965d8';
  out text := ''; pass int := 0; fail int := 0; u text; mid uuid; ev uuid := gen_random_uuid(); d date;
  home text;
BEGIN
  SELECT unit_id INTO home FROM public.profiles WHERE id = admin_u;
  INSERT INTO public.units(id, name) VALUES ('zz_db3', 'DB3 Harness Lodge') ON CONFLICT DO NOTHING;

  -- 1. service-role status change on a member in lodge B lands in lodge B
  UPDATE public.profiles SET unit_id = 'zz_db3' WHERE id = member_u;
  PERFORM set_config('request.jwt.claims', json_build_object('role','service_role')::text, true);
  EXECUTE 'SET LOCAL ROLE service_role';
  UPDATE public.profiles SET status = CASE WHEN status = 'year_out' THEN 'active'::member_status ELSE 'year_out'::member_status END WHERE id = member_u;
  EXECUTE 'RESET ROLE';
  SELECT unit_id INTO u FROM public.member_status_history WHERE profile_id = member_u ORDER BY created_at DESC, id DESC LIMIT 1;
  IF u = 'zz_db3' THEN pass := pass+1; out := out || '1 status->profile lodge OK; '; ELSE fail := fail+1; out := out || '1 FAIL('||coalesce(u,'null')||'); '; END IF;

  -- 2. same for the home lodge (one-lodge behaviour unchanged)
  UPDATE public.profiles SET unit_id = home WHERE id = member_u;
  EXECUTE 'SET LOCAL ROLE service_role';
  UPDATE public.profiles SET status = CASE WHEN status = 'year_out' THEN 'active'::member_status ELSE 'year_out'::member_status END WHERE id = member_u;
  EXECUTE 'RESET ROLE';
  SELECT unit_id INTO u FROM public.member_status_history WHERE profile_id = member_u ORDER BY created_at DESC, id DESC LIMIT 1;
  IF u = home THEN pass := pass+1; out := out || '2 home status OK; '; ELSE fail := fail+1; out := out || '2 FAIL; '; END IF;

  -- 3. blank profile lodge: status change refused (never another lodge)
  BEGIN
    UPDATE public.profiles SET unit_id = '' WHERE id = member_u;
    UPDATE public.profiles SET status = CASE WHEN status = 'year_out' THEN 'active'::member_status ELSE 'year_out'::member_status END WHERE id = member_u;
    fail := fail+1; out := out || '3 blank ALLOWED FAIL; ';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = 'P0001' THEN pass := pass+1; out := out || '3 blank refused OK; '; ELSE fail := fail+1; out := out || '3 FAIL('||SQLSTATE||'); '; END IF;
  END;
  UPDATE public.profiles SET unit_id = home WHERE id = member_u;

  -- 4. diary add by a lodge-B diary manager lands in lodge B (meeting + audit)
  UPDATE public.profiles SET unit_id = 'zz_db3' WHERE id = admin_u;
  PERFORM set_config('request.jwt.claims', json_build_object('sub',admin_u,'role','authenticated')::text, true);
  d := DATE '2099-01-07';
  EXECUTE 'SET LOCAL ROLE authenticated';
  mid := public.diary_add_meeting(d, 'regular'::festive_meeting_type, NULL, 'db3');
  EXECUTE 'RESET ROLE';
  SELECT unit_id INTO u FROM public.festive_board_meetings WHERE id = mid;
  IF u = 'zz_db3' THEN pass := pass+1; out := out || '4 add->caller lodge OK; '; ELSE fail := fail+1; out := out || '4 FAIL('||coalesce(u,'null')||'); '; END IF;
  SELECT unit_id INTO u FROM public.meeting_diary_audit WHERE target_id = mid::text AND action = 'insert' LIMIT 1;
  IF u = 'zz_db3' THEN pass := pass+1; out := out || '5 audit->meeting lodge OK; '; ELSE fail := fail+1; out := out || '5 FAIL('||coalesce(u,'null')||'); '; END IF;

  -- 6. diary move: meeting stays in its lodge, audit row in meeting's lodge
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.diary_move_meeting(mid, d + 7);
  EXECUTE 'RESET ROLE';
  SELECT unit_id INTO u FROM public.meeting_diary_audit WHERE target_id = mid::text AND action = 'update' ORDER BY created_at DESC LIMIT 1;
  IF u = 'zz_db3' AND (SELECT meeting_date FROM public.festive_board_meetings WHERE id = mid) = d + 7
    THEN pass := pass+1; out := out || '6 move->meeting lodge OK; '; ELSE fail := fail+1; out := out || '6 FAIL('||coalesce(u,'null')||'); '; END IF;

  -- 7. diary add by a manager with a blank lodge is refused
  UPDATE public.profiles SET unit_id = '' WHERE id = admin_u;
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM public.diary_add_meeting(d + 14, 'regular'::festive_meeting_type, NULL, NULL);
    EXECUTE 'RESET ROLE';
    fail := fail+1; out := out || '7 blank add ALLOWED FAIL; ';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    IF SQLSTATE = 'P0001' AND SQLERRM LIKE 'No lodge%' THEN pass := pass+1; out := out || '7 blank add refused OK; '; ELSE fail := fail+1; out := out || '7 FAIL('||SQLSTATE||' '||SQLERRM||'); '; END IF;
  END;
  UPDATE public.profiles SET unit_id = home WHERE id = admin_u;

  -- 8. festive-board sync from a lodge-B event lands in lodge B
  INSERT INTO public.lodge_events(id, slug, title, event_date, published, unit_id)
  VALUES (ev, 'db3-harness-' || ev::text, 'DB3 harness', DATE '2099-02-04', false, 'zz_db3');
  SELECT unit_id INTO u FROM public.festive_board_meetings WHERE lodge_event_id = ev;
  IF u = 'zz_db3' THEN pass := pass+1; out := out || '8 sync->event lodge OK; '; ELSE fail := fail+1; out := out || '8 FAIL('||coalesce(u,'null')||'); '; END IF;

  RAISE EXCEPTION 'JOBDB3 pass=% fail=% | %', pass, fail, out;
END $$;
