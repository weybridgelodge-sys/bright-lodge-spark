-- JOB DD check (rolled back: the block ends by raising its result).
DO $$
DECLARE pass int := 0; fail int := 0; out text := ''; m1 uuid; m2 uuid; yr int := public.current_officer_year(); n_before int; n_after int;
BEGIN
  SELECT id INTO m1 FROM public.profiles ORDER BY id LIMIT 1;
  SELECT id INTO m2 FROM public.profiles ORDER BY id OFFSET 1 LIMIT 1;
  INSERT INTO public.units(id) VALUES ('jobdd_b');
  INSERT INTO public.officer_positions(key,label,order_index,category,unit_id,active) VALUES
    ('rep_jobdd_on','DD active',9101,'representative','jobdd_b',true),
    ('rep_jobdd_off','DD inactive',9102,'representative','jobdd_b',false);
  INSERT INTO public.officer_appointments(position_key,lodge_year,member_id,unit_id,appointed_on) VALUES
    ('rep_jobdd_on',yr,m1,'jobdd_b',current_date - 1),
    ('rep_jobdd_off',yr,m2,'jobdd_b',current_date - 1);
  IF NOT EXISTS (SELECT 1 FROM public.get_officers_public(NULL,'jobdd_b') WHERE position_key='rep_jobdd_off')
    THEN pass:=pass+1; out:=out||' PASS inactive-absent'; ELSE fail:=fail+1; out:=out||' FAIL inactive-absent'; END IF;
  IF EXISTS (SELECT 1 FROM public.get_officers_public(NULL,'jobdd_b') WHERE position_key='rep_jobdd_on')
    THEN pass:=pass+1; out:=out||' PASS active-present'; ELSE fail:=fail+1; out:=out||' FAIL active-present'; END IF;
  -- Lodge with no inactive posts: compare to the pre-0178 rule (no active filter) for weybridge minus its inactive posts' holders.
  UPDATE public.officer_positions SET active = true WHERE unit_id = 'weybridge' AND active = false;
  n_after := (SELECT count(*) FROM public.get_officers_public(NULL,'weybridge'));
  SELECT count(*) INTO n_before FROM (
    SELECT public.current_officer_holder(op.key, (now() AT TIME ZONE 'Europe/London')::date, 'weybridge') AS mid
    FROM public.officer_positions op) h JOIN public.profiles p ON p.id = h.mid;
  IF n_before = n_after THEN pass:=pass+1; out:=out||' PASS no-inactive-identical('||n_after||')'; ELSE fail:=fail+1; out:=out||' FAIL identical '||n_before||'/'||n_after; END IF;
  IF public.get_officers_public_year('weybridge') IS NOT NULL THEN pass:=pass+1; out:=out||' PASS year-unchanged'; ELSE fail:=fail+1; out:=out||' FAIL year'; END IF;
  RAISE EXCEPTION 'JOBDD RESULT pass=% fail=%:%', pass, fail, out;
END $$;
