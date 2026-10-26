-- Job CT: a lodge Secretary inserting a representative post with no unit_id gets the lodge
-- (officer_positions_fill_unit + RLS). Ends with RAISE, so nothing is kept. Expect match=t.
DO $$ DECLARE r_role text := current_user; sec uuid := public.current_officer_holder('secretary', DATE '2026-10-26'); nr record; BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', sec, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
  INSERT INTO public.officer_positions (key, label, order_index, is_progressive, category, include_in)
  VALUES ('rep_ct_test_' || extract(epoch from now())::bigint, 'CT Test Rep', 340, false, 'representative', '{"summons":true,"provincial_return":true}') RETURNING * INTO nr;
  PERFORM set_config('role', r_role, true);
  RAISE EXCEPTION 'CT unit=% expected=% match=% role_back=%', nr.unit_id, (SELECT id FROM public.units), nr.unit_id = (SELECT id FROM public.units), current_user;
END $$;
