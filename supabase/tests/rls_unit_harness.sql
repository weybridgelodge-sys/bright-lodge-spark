-- JOB CO: lodge-scoped access rules harness.
-- Runs entirely inside one DO block that ends with RAISE EXCEPTION, so every
-- change (temporary second lodge, moved rows, test inserts) is rolled back.
-- Uses request.jwt.claims + SET LOCAL ROLE; no real sessions.
-- Replace :tables / user ids below when re-running.
DO $$
DECLARE
  admin_u text := 'de693c92-6f3d-49b6-afc3-406fc4c0acd9';
  member_u text := '40192a1a-1990-48a5-b360-f67ce5c965d8';
  tabs text[] := ARRAY['secretary_returns','installation_rule_settings','meeting_diary_audit','meeting_series','member_status_history','unit_settings_audit'];
  -- officer_installation_dates and unit_settings have no id column: covered by jobdb5_check.sql.
  t text; n int; n2 int; out text := ''; rowj jsonb; vid text; ok boolean;
BEGIN
  INSERT INTO public.units(id, name) VALUES ('zz_harness', 'Harness Lodge') ON CONFLICT DO NOTHING;
  FOREACH t IN ARRAY tabs LOOP
    -- pick one row and remember its id
    EXECUTE format('SELECT to_jsonb(x) FROM public.%I x LIMIT 1', t) INTO rowj;
    -- 1. own-lodge read (admin) before moving
    PERFORM set_config('request.jwt.claims', json_build_object('sub',admin_u,'role','authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
    EXECUTE 'RESET ROLE';
    out := out || t || ': own=' || n;
    IF rowj IS NOT NULL THEN
      vid := rowj->>'id';
      -- 2. move that row to the other lodge (as owner) and check it disappears
      EXECUTE format('UPDATE public.%I SET unit_id = %L WHERE id::text = %L', t, 'zz_harness', vid);
      EXECUTE 'SET LOCAL ROLE authenticated';
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n2;
      out := out || ' afterOtherLodge=' || n2 || CASE WHEN n2 = n-1 THEN ' OK' ELSE ' FAIL' END;
      -- 3. update of other-lodge row affects 0 rows
      EXECUTE format('UPDATE public.%I SET unit_id = unit_id WHERE id::text = %L', t, vid);
      GET DIAGNOSTICS n2 = ROW_COUNT;
      out := out || ' otherUpdate=' || n2 || CASE WHEN n2 = 0 THEN ' OK' ELSE ' FAIL' END;
      EXECUTE 'RESET ROLE';
      EXECUTE format('UPDATE public.%I SET unit_id = %L WHERE id::text = %L', t, 'weybridge', vid);
      -- 4. move own row into other lodge refused (WITH CHECK)
      EXECUTE 'SET LOCAL ROLE authenticated';
      BEGIN
        EXECUTE format('UPDATE public.%I SET unit_id = %L WHERE id::text = %L', t, 'zz_harness', vid);
        out := out || ' move=ALLOWED FAIL';
      EXCEPTION WHEN insufficient_privilege THEN out := out || ' move=refused OK';
      END;
      -- 5. insert into other lodge refused
      BEGIN
        EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I, %L::jsonb)', t, t,
          (rowj || jsonb_build_object('id', gen_random_uuid(), 'unit_id', 'zz_harness'))::text);
        out := out || ' insertOther=ALLOWED FAIL';
      EXCEPTION WHEN insufficient_privilege THEN out := out || ' insertOther=refused OK';
        WHEN OTHERS THEN out := out || ' insertOther=error(' || SQLSTATE || ')';
      END;
      EXECUTE 'RESET ROLE';
    END IF;
    -- 6. blank-lodge member sees nothing
    UPDATE public.profiles SET unit_id = '' WHERE id::text = admin_u;
    EXECUTE 'SET LOCAL ROLE authenticated';
    EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n2;
    out := out || ' blankLodge=' || n2 || CASE WHEN n2 = 0 THEN ' OK' ELSE ' FAIL' END;
    EXECUTE 'RESET ROLE';
    UPDATE public.profiles SET unit_id = 'weybridge' WHERE id::text = admin_u;
    -- 7. ordinary member count
    PERFORM set_config('request.jwt.claims', json_build_object('sub',member_u,'role','authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n2;
    out := out || ' member=' || n2 || ' | ';
    EXECUTE 'RESET ROLE';
  END LOOP;
  RAISE EXCEPTION 'HARNESS %', out;
END $$;
