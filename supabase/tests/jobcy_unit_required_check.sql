-- JOB CY check (rolled back by the final RAISE). Run as the database owner.
DO $$
DECLARE
  u text := (SELECT id FROM public.units ORDER BY id LIMIT 1);
  mem uuid := (SELECT id FROM public.profiles WHERE status = 'active' AND unit_id = u ORDER BY id LIMIT 1);
  acc uuid := (SELECT id FROM public.event_accounts ORDER BY created_at LIMIT 1);
  t text; v text; ok boolean; st text; out text := ''; fails int := 0; rid uuid; ru text;
  ins text;
BEGIN
  FOREACH t IN ARRAY ARRAY['event_bookings','visitor_contacts','officer_appointments','event_accounts'] LOOP
    FOREACH v IN ARRAY ARRAY['none','blank'] LOOP
      ins := CASE t
        WHEN 'event_bookings' THEN format('INSERT INTO public.event_bookings (event_id, payer_name%s) VALUES (%L, %L%s) RETURNING id, unit_id',
             CASE v WHEN 'blank' THEN ', unit_id' ELSE '' END, CASE WHEN v = 'none' AND false THEN acc ELSE gen_random_uuid() END, 'Cy Test', CASE v WHEN 'blank' THEN ', ''  ''' ELSE '' END)
        WHEN 'visitor_contacts' THEN format('INSERT INTO public.visitor_contacts (email%s) VALUES (%L%s) RETURNING id, unit_id',
             CASE v WHEN 'blank' THEN ', unit_id' ELSE '' END, 'cy.' || v || '@example.invalid', CASE v WHEN 'blank' THEN ', ''  ''' ELSE '' END)
        WHEN 'officer_appointments' THEN format('INSERT INTO public.officer_appointments (position_key, lodge_year, member_id%s) VALUES (''steward'', 2040, %L%s) RETURNING id, unit_id',
             CASE v WHEN 'blank' THEN ', unit_id' ELSE '' END, mem, CASE v WHEN 'blank' THEN ', ''  ''' ELSE '' END)
        ELSE format('INSERT INTO public.event_accounts SELECT * FROM jsonb_populate_record(NULL::public.event_accounts, (SELECT (to_jsonb(e) - ''unit_id'') || jsonb_build_object(''id'', gen_random_uuid(), ''slug'', ''cy-'' || gen_random_uuid()%s) FROM public.event_accounts e WHERE e.id = %L)) RETURNING id, unit_id',
             CASE v WHEN 'blank' THEN ', ''unit_id'', ''  ''' ELSE '' END, acc)
      END;
      -- no signed-in caller (event_bookings uses an event id with no lodge)
      PERFORM set_config('request.jwt.claims', '', true);
      ok := false; st := 'inserted';
      BEGIN EXECUTE ins INTO rid, ru;
      EXCEPTION WHEN OTHERS THEN st := SQLSTATE; ok := SQLSTATE IN ('P0001','23502','23514'); END;
      out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || format(' %s: %s unit, no caller refused (%s)', t, v, st) || E'\n'; fails := fails + (NOT ok)::int;
    END LOOP;
    -- signed-in member, no unit given: lands in own lodge
    IF t = 'event_bookings' THEN ins := format('INSERT INTO public.event_bookings (event_id, payer_name) VALUES (%L, ''Cy Own'') RETURNING id, unit_id', acc);
    ELSE ins := replace(replace(ins, ', ''  ''', ''), ', unit_id)', ')'); ins := replace(ins, ', ''unit_id'', ''  ''', ''); ins := replace(ins, 'cy.blank@', 'cy.own@'); END IF;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', mem, 'role', 'authenticated')::text, true);
    BEGIN EXECUTE ins INTO rid, ru; ok := ru = u; st := ru;
    EXCEPTION WHEN OTHERS THEN ok := false; st := SQLSTATE || ' ' || left(SQLERRM, 80); END;
    out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || format(' %s: signed-in member lands in own lodge (%s)', t, st) || E'\n'; fails := fails + (NOT ok)::int;
    -- explicit blank written straight to the column is refused by the CHECK
    ok := false;
    BEGIN EXECUTE format('UPDATE public.%I SET unit_id = ''  '' WHERE id = %L', t, rid);
    EXCEPTION WHEN check_violation THEN ok := true; WHEN OTHERS THEN ok := t = 'event_accounts'; END; -- event_accounts update trigger keeps the old lodge
    IF t = 'event_accounts' AND ok THEN ok := (SELECT unit_id FROM public.event_accounts WHERE id = rid) = u; END IF;
    out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || format(' %s: blank unit on update refused/kept', t) || E'\n'; fails := fails + (NOT ok)::int;
  END LOOP;
  PERFORM set_config('request.jwt.claims', '', true);
  -- officer_positions can still hold blank-lodge (shared) rows: column nullable, 27 shared offices kept
  ok := (SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='officer_positions' AND column_name='unit_id') = 'YES'
        AND (SELECT count(*) FROM public.officer_positions WHERE coalesce(btrim(unit_id),'') = '') = 27
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.officer_positions'::regclass AND conname LIKE '%unit_id_not_blank');
  out := out || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END || ' officer_positions: blank-lodge rows still allowed (nullable, 27 shared)' || E'\n'; fails := fails + (NOT ok)::int;
  RAISE EXCEPTION 'HARNESS fails=% %', fails, E'\n' || out;
END $$;
