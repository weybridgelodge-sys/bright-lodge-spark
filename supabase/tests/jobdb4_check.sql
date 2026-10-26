-- JOB DB4 check (rolled back: ends with RAISE EXCEPTION).
DO $$
DECLARE
  admin_u uuid := 'de693c92-6f3d-49b6-afc3-406fc4c0acd9';
  member_u uuid := '40192a1a-1990-48a5-b360-f67ce5c965d8';
  out text := ''; pass int := 0; fail int := 0; u text; home text; n int; mid uuid; sid uuid;
BEGIN
  SELECT unit_id INTO home FROM public.profiles WHERE id = admin_u;
  -- 1. no column default left on the six
  SELECT count(*) INTO n FROM information_schema.columns WHERE table_schema='public' AND column_name='unit_id' AND column_default ILIKE '%current_unit_id%';
  IF n = 0 THEN pass:=pass+1; out:=out||'1 no defaults OK; '; ELSE fail:=fail+1; out:=out||'1 FAIL('||n||'); '; END IF;
  -- 2. signed-in insert (no unit given) lands in own lodge: meeting_series and festive_board_meetings
  PERFORM set_config('request.jwt.claims', json_build_object('sub',admin_u,'role','authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  INSERT INTO public.meeting_series(name, weekday, ordinal) VALUES ('db4', 3, '1') RETURNING id INTO sid;
  INSERT INTO public.festive_board_meetings(meeting_date, meeting_type, status) VALUES (DATE '2099-03-04', 'regular', 'draft') RETURNING id INTO mid;
  EXECUTE 'RESET ROLE';
  IF (SELECT unit_id FROM public.meeting_series WHERE id=sid) = home AND (SELECT unit_id FROM public.festive_board_meetings WHERE id=mid) = home
    THEN pass:=pass+1; out:=out||'2 signed-in own lodge OK; '; ELSE fail:=fail+1; out:=out||'2 FAIL; '; END IF;
  -- 3. service-role status change still logs (imports)
  SELECT count(*) INTO n FROM public.member_status_history WHERE profile_id = member_u;
  PERFORM set_config('request.jwt.claims', json_build_object('role','service_role')::text, true);
  EXECUTE 'SET LOCAL ROLE service_role';
  UPDATE public.profiles SET status = CASE WHEN status='year_out' THEN 'active'::member_status ELSE 'year_out'::member_status END WHERE id = member_u;
  EXECUTE 'RESET ROLE';
  IF (SELECT count(*) FROM public.member_status_history WHERE profile_id = member_u AND unit_id = home) >= 1
     AND (SELECT count(*) FROM public.member_status_history WHERE profile_id = member_u) = n + 1
    THEN pass:=pass+1; out:=out||'3 service-role status logs OK; '; ELSE fail:=fail+1; out:=out||'3 FAIL; '; END IF;
  -- 4-9. no lodge, no session: refused with P0001 no_unit_for_write on each of the six
  PERFORM set_config('request.jwt.claims', '', true);
  BEGIN INSERT INTO public.festive_board_meetings(meeting_date, meeting_type, status) VALUES (DATE '2099-03-11','regular','draft'); fail:=fail+1; out:=out||'4 FAIL; ';
  EXCEPTION WHEN OTHERS THEN IF SQLSTATE='P0001' THEN pass:=pass+1; out:=out||'4 fbm refused OK; '; ELSE fail:=fail+1; out:=out||'4 '||SQLSTATE||'; '; END IF; END;
  BEGIN INSERT INTO public.meeting_series(name, weekday, ordinal) VALUES ('db4x',3,'1'); fail:=fail+1; out:=out||'5 FAIL; ';
  EXCEPTION WHEN OTHERS THEN IF SQLSTATE='P0001' THEN pass:=pass+1; out:=out||'5 series refused OK; '; ELSE fail:=fail+1; out:=out||'5 '||SQLSTATE||'; '; END IF; END;
  BEGIN INSERT INTO public.officer_installation_dates(lodge_year, installation_date) VALUES (2099, DATE '2099-04-01'); fail:=fail+1; out:=out||'6 FAIL; ';
  EXCEPTION WHEN OTHERS THEN IF SQLSTATE='P0001' THEN pass:=pass+1; out:=out||'6 install dates refused OK; '; ELSE fail:=fail+1; out:=out||'6 '||SQLSTATE||'; '; END IF; END;
  BEGIN INSERT INTO public.installation_rule_settings(mode, fixed_day, installation_month) VALUES ('fixed_date', 1, 4); fail:=fail+1; out:=out||'7 FAIL; ';
  EXCEPTION WHEN OTHERS THEN IF SQLSTATE='P0001' THEN pass:=pass+1; out:=out||'7 rule refused OK; '; ELSE fail:=fail+1; out:=out||'7 '||SQLSTATE||'; '; END IF; END;
  BEGIN INSERT INTO public.meeting_diary_audit(action, target_table, target_id) VALUES ('insert','x','x'); fail:=fail+1; out:=out||'8 FAIL; ';
  EXCEPTION WHEN OTHERS THEN IF SQLSTATE='P0001' THEN pass:=pass+1; out:=out||'8 audit refused OK; '; ELSE fail:=fail+1; out:=out||'8 '||SQLSTATE||'; '; END IF; END;
  BEGIN INSERT INTO public.member_status_history(profile_id, kind, status, effective_date) VALUES (member_u,'status','active',current_date); fail:=fail+1; out:=out||'9 FAIL; ';
  EXCEPTION WHEN OTHERS THEN IF SQLSTATE='P0001' THEN pass:=pass+1; out:=out||'9 history refused OK; '; ELSE fail:=fail+1; out:=out||'9 '||SQLSTATE||'; '; END IF; END;
  RAISE EXCEPTION 'JOBDB4 pass=% fail=% | %', pass, fail, out;
END $$;
