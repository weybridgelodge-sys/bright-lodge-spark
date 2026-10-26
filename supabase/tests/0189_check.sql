-- 0189 check: bank_details visible only to Unit Setup roles + current Treasurer. Rolled back (ends with RAISE EXCEPTION).
DO $$
DECLARE
  m uuid; home text; other_n int; total int; out text := ''; pass int := 0; fail int := 0;
  r text; n int; nb int; yr text; v jsonb;
BEGIN
  SELECT p.id, p.unit_id INTO m, home FROM public.profiles p
   WHERE p.status = 'active' AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role <> 'member')
     AND NOT EXISTS (SELECT 1 FROM public.officer_appointments oa WHERE oa.member_id = p.id)
   LIMIT 1;
  SELECT count(*) INTO total FROM public.unit_settings WHERE unit_id = home;
  SELECT count(*) INTO other_n FROM public.unit_settings WHERE unit_id = home AND key <> 'bank_details';

  -- helper: count as m
  FOR r IN SELECT unnest(ARRAY['plain','almoner+charity_steward+membership_officer','secretary','admin','treasurer','worshipful_master','assistant_secretary']) LOOP
    -- reset grants for m
    DELETE FROM public.user_roles WHERE user_id = m AND role <> 'member';
    DELETE FROM public.officer_appointments WHERE member_id = m;
    IF r = 'almoner+charity_steward+membership_officer' THEN
      INSERT INTO public.user_roles(user_id, role) VALUES (m,'almoner'),(m,'charity_steward');
      IF EXISTS (SELECT 1 FROM public.officer_positions WHERE key='membership_officer') THEN
        INSERT INTO public.officer_appointments(position_key, member_id, lodge_year, unit_id)
        SELECT 'membership_officer', m, public.current_officer_year(), home;
      END IF;
    ELSIF r IN ('secretary','admin','worshipful_master','assistant_secretary') THEN
      INSERT INTO public.user_roles(user_id, role) VALUES (m, r::public.app_role);
    ELSIF r = 'treasurer' THEN
      INSERT INTO public.officer_appointments(position_key, member_id, lodge_year, unit_id, appointed_on)
      VALUES ('treasurer', m, public.current_officer_year(), home, current_date - 1);
      out := out || '[treasurer is_current_officer=' || public.is_current_officer(m,'treasurer') || '] ';
    END IF;
    PERFORM set_config('request.jwt.claims', json_build_object('sub',m,'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) FILTER (WHERE key <> 'bank_details'), count(*) FILTER (WHERE key = 'bank_details') INTO n, nb FROM public.unit_settings;
    RESET ROLE;
    IF n = other_n AND nb = (CASE WHEN r IN ('plain','almoner+charity_steward+membership_officer') THEN 0 ELSE 1 END)
      THEN pass := pass+1; out := out||r||': other='||n||' bank='||nb||' OK; ';
      ELSE fail := fail+1; out := out||r||': other='||n||' bank='||nb||' FAIL; '; END IF;
  END LOOP;

  -- 5. other-unit member (secretary role, moved to another lodge)
  DELETE FROM public.officer_appointments WHERE member_id = m;
  INSERT INTO public.units(id,name) VALUES ('zz_0189','0189 Harness Lodge') ON CONFLICT DO NOTHING;
  UPDATE public.profiles SET unit_id = 'zz_0189' WHERE id = m;
  PERFORM set_config('request.jwt.claims', json_build_object('sub',m,'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.unit_settings WHERE unit_id = home;
  RESET ROLE;
  IF n = 0 THEN pass:=pass+1; out:=out||'other-unit rows='||n||' OK; '; ELSE fail:=fail+1; out:=out||'other-unit rows='||n||' FAIL; '; END IF;
  UPDATE public.profiles SET unit_id = home WHERE id = m;

  -- 4. anon
  PERFORM set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  BEGIN
    SET LOCAL ROLE anon;
    SELECT count(*) INTO n FROM public.unit_settings;
    RESET ROLE;
    fail:=fail+1; out:=out||'anon rows='||n||' FAIL(no error); ';
  EXCEPTION WHEN insufficient_privilege THEN
    pass:=pass+1; out:=out||'anon denied OK; ';
  END;

  -- 7. save_unit_setup as Secretary (role) keeps bank_details
  DELETE FROM public.user_roles WHERE user_id = m AND role <> 'member';
  INSERT INTO public.user_roles(user_id, role) VALUES (m,'secretary');
  PERFORM set_config('request.jwt.claims', json_build_object('sub',m,'role','authenticated')::text, true);
  SELECT value INTO v FROM public.unit_settings WHERE unit_id = home AND key='bank_details';
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.save_unit_setup('bank_details', coalesce(v,'{}'::jsonb) || '{"reference_pattern":"0189-TEST"}'::jsonb);
  EXCEPTION WHEN OTHERS THEN out := out || 'save err: '||SQLERRM||'; ';
  END;
  RESET ROLE;
  IF (SELECT value->>'reference_pattern' FROM public.unit_settings WHERE unit_id=home AND key='bank_details') = '0189-TEST'
    THEN pass:=pass+1; out:=out||'save_unit_setup bank OK; ';
    ELSE fail:=fail+1; out:=out||'save_unit_setup bank FAIL; '; END IF;

  RAISE EXCEPTION '0189 CHECK pass=% fail=% total_keys=% :: %', pass, fail, total, out;
END $$;
