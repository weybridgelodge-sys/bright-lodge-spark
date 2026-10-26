-- JOB DC check: offices held hides inactive posts; delete_representative_position rules.
-- Everything is rolled back: the block ends by raising its own result line.
DO $$
DECLARE
  sec uuid := (SELECT ur.user_id FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id
               WHERE ur.role = 'secretary' AND p.unit_id = 'weybridge' LIMIT 1);
  yr int := public.current_officer_year();
  out text := ''; pass int := 0; fail int := 0; r jsonb; msg text;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', sec, 'role', 'authenticated')::text, true);

  INSERT INTO public.officer_positions(key,label,order_index,category,unit_id,active)
  VALUES ('rep_jobdc_inactive','JobDC inactive',9001,'representative','weybridge',false),
         ('rep_jobdc_active','JobDC active',9002,'representative','weybridge',true),
         ('rep_jobdc_returned','JobDC returned',9003,'representative','weybridge',false);
  INSERT INTO public.officer_appointments(position_key,lodge_year,member_id,unit_id,appointed_on)
  VALUES ('rep_jobdc_inactive',yr,sec,'weybridge',current_date - 1),
         ('rep_jobdc_active',yr,sec,'weybridge',current_date - 1),
         ('rep_jobdc_returned',yr,sec,'weybridge',current_date - 1);
  INSERT INTO public.units(id) VALUES ('jobdc_other');
  INSERT INTO public.officer_positions(key,label,order_index,category,unit_id,active)
  VALUES ('rep_jobdc_other','JobDC other lodge',9004,'representative','jobdc_other',false);
  INSERT INTO public.provincial_return_submissions(lodge_year,sent_at,recipient_email,storage_path)
  VALUES (yr, now() + interval '1 minute', 'jobdc@example.invalid', 'jobdc/none.pdf');
  -- The 'returned' appointment must predate the sent return; the other two are created after it.
  UPDATE public.officer_appointments SET created_at = now() + interval '2 minutes'
   WHERE position_key IN ('rep_jobdc_inactive','rep_jobdc_active');

  -- 1. inactive hidden, 2. active shown
  IF NOT EXISTS (SELECT 1 FROM public.get_member_offices_held(sec) WHERE position_key = 'rep_jobdc_inactive')
    THEN pass := pass + 1; out := out || ' PASS inactive-hidden'; ELSE fail := fail + 1; out := out || ' FAIL inactive-hidden'; END IF;
  IF EXISTS (SELECT 1 FROM public.get_member_offices_held(sec) WHERE position_key = 'rep_jobdc_active')
    THEN pass := pass + 1; out := out || ' PASS active-shown'; ELSE fail := fail + 1; out := out || ' FAIL active-shown'; END IF;

  -- 3-6 refusals
  FOREACH msg IN ARRAY ARRAY['worshipful_master|Shared','rep_jobdc_active|Deactivate','rep_jobdc_other|another lodge','rep_jobdc_returned|submitted return'] LOOP
    BEGIN
      PERFORM public.delete_representative_position(split_part(msg,'|',1));
      fail := fail + 1; out := out || ' FAIL refuse:' || split_part(msg,'|',1);
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM ILIKE '%' || split_part(msg,'|',2) || '%' THEN pass := pass + 1; out := out || ' PASS refuse:' || split_part(msg,'|',1);
      ELSE fail := fail + 1; out := out || ' FAIL refuse:' || split_part(msg,'|',1) || '(' || SQLERRM || ')'; END IF;
    END;
  END LOOP;

  -- 7. success for own inactive rep post with one appointment
  r := public.delete_representative_position('rep_jobdc_inactive');
  IF (r->>'deleted_appointments')::int = 1
     AND NOT EXISTS (SELECT 1 FROM public.officer_positions WHERE key = 'rep_jobdc_inactive')
     AND EXISTS (SELECT 1 FROM public.officer_positions WHERE key = 'rep_jobdc_other')
    THEN pass := pass + 1; out := out || ' PASS delete-own'; ELSE fail := fail + 1; out := out || ' FAIL delete-own ' || r::text; END IF;

  -- 8. signed out refused
  PERFORM set_config('request.jwt.claims', '', true);
  BEGIN
    PERFORM public.delete_representative_position('rep_jobdc_returned');
    fail := fail + 1; out := out || ' FAIL refuse:signed-out';
  EXCEPTION WHEN OTHERS THEN pass := pass + 1; out := out || ' PASS refuse:signed-out'; END;

  RAISE EXCEPTION 'JOBDC RESULT pass=% fail=%:%', pass, fail, out;
END $$;
