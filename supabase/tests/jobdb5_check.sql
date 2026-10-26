-- JOB DB5 per-table check (rolled back: ends with RAISE EXCEPTION). Replace __T__ with the table and
-- __UPD__ with true when an admin/Secretary UPDATE policy exists on it.
DO $$
DECLARE
  t text := '__T__'; can_upd boolean := __UPD__;
  admin_u uuid := 'de693c92-6f3d-49b6-afc3-406fc4c0acd9';
  member_u uuid := '40192a1a-1990-48a5-b360-f67ce5c965d8';
  home text; total int; homeN int; n int; pass int := 0; fail int := 0; out text := ''; rowj jsonb;
BEGIN
  SELECT unit_id INTO home FROM public.profiles WHERE id = admin_u;
  EXECUTE format('SELECT count(*) FROM public.%I', t) INTO total;
  EXECUTE format('SELECT count(*) FROM public.%I WHERE unit_id = %L', t, home) INTO homeN;
  EXECUTE format('SELECT to_jsonb(x) FROM public.%I x WHERE unit_id = %L LIMIT 1', t, home) INTO rowj;
  INSERT INTO public.units(id, name) VALUES ('zz_db5', 'DB5 Harness Lodge') ON CONFLICT DO NOTHING;

  -- (a) home-lodge admin/Secretary: reads every home row; update (no-op) reaches them when allowed
  PERFORM set_config('request.jwt.claims', json_build_object('sub',admin_u,'role','authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
  IF n = homeN THEN pass:=pass+1; out:=out||'a.read='||n||' OK; '; ELSE fail:=fail+1; out:=out||'a.read='||n||'/'||homeN||' FAIL; '; END IF;
  EXECUTE format('UPDATE public.%I SET unit_id = unit_id', t); GET DIAGNOSTICS n = ROW_COUNT;
  IF n = (CASE WHEN can_upd THEN homeN ELSE 0 END) THEN pass:=pass+1; out:=out||'a.update='||n||' OK; '; ELSE fail:=fail+1; out:=out||'a.update='||n||' FAIL; '; END IF;
  EXECUTE 'RESET ROLE';
  -- ordinary member read count (reported, for comparison with before)
  PERFORM set_config('request.jwt.claims', json_build_object('sub',member_u,'role','authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
  EXECUTE 'RESET ROLE';
  out := out || 'member.read=' || n || '; ';

  -- (b) blank profile lodge: 0 rows, no write
  UPDATE public.profiles SET unit_id = '' WHERE id = admin_u;
  PERFORM set_config('request.jwt.claims', json_build_object('sub',admin_u,'role','authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
  IF n = 0 THEN pass:=pass+1; out:=out||'b.read=0 OK; '; ELSE fail:=fail+1; out:=out||'b.read='||n||' FAIL; '; END IF;
  EXECUTE format('UPDATE public.%I SET unit_id = unit_id', t); GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN pass:=pass+1; out:=out||'b.update=0 OK; '; ELSE fail:=fail+1; out:=out||'b.update='||n||' FAIL; '; END IF;
  IF rowj IS NOT NULL THEN BEGIN
    EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I, %L::jsonb)', t, t, (rowj || jsonb_build_object('id', gen_random_uuid()))::text);
    fail:=fail+1; out:=out||'b.insert=ALLOWED FAIL; ';
  EXCEPTION WHEN insufficient_privilege THEN pass:=pass+1; out:=out||'b.insert=refused OK; ';
    WHEN OTHERS THEN fail:=fail+1; out:=out||'b.insert=error('||SQLSTATE||') FAIL; '; END; END IF;
  EXECUTE 'RESET ROLE';

  -- (c) member of a second lodge: none of the home rows, cannot write them
  UPDATE public.profiles SET unit_id = 'zz_db5' WHERE id = admin_u;
  EXECUTE 'SET LOCAL ROLE authenticated';
  EXECUTE format('SELECT count(*) FROM public.%I WHERE unit_id = %L', t, home) INTO n;
  IF n = 0 THEN pass:=pass+1; out:=out||'c.read=0 OK; '; ELSE fail:=fail+1; out:=out||'c.read='||n||' FAIL; '; END IF;
  EXECUTE format('UPDATE public.%I SET unit_id = unit_id WHERE unit_id = %L', t, home); GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN pass:=pass+1; out:=out||'c.update=0 OK; '; ELSE fail:=fail+1; out:=out||'c.update='||n||' FAIL; '; END IF;
  IF rowj IS NOT NULL THEN BEGIN
    EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I, %L::jsonb)', t, t, (rowj || jsonb_build_object('id', gen_random_uuid()))::text);
    fail:=fail+1; out:=out||'c.insertHome=ALLOWED FAIL; ';
  EXCEPTION WHEN insufficient_privilege THEN pass:=pass+1; out:=out||'c.insertHome=refused OK; ';
    WHEN OTHERS THEN fail:=fail+1; out:=out||'c.insertHome=error('||SQLSTATE||') FAIL; '; END; END IF;
  EXECUTE 'RESET ROLE';
  UPDATE public.profiles SET unit_id = home WHERE id = admin_u;

  -- (d) service_role still sees everything
  PERFORM set_config('request.jwt.claims', json_build_object('role','service_role')::text, true);
  EXECUTE 'SET LOCAL ROLE service_role';
  EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
  EXECUTE 'RESET ROLE';
  IF n = total THEN pass:=pass+1; out:=out||'d.service='||n||' OK; '; ELSE fail:=fail+1; out:=out||'d.service='||n||'/'||total||' FAIL; '; END IF;

  RAISE EXCEPTION 'JOBDB5 % pass=% fail=% rows=% | %', t, pass, fail, homeN, out;
END $$;
