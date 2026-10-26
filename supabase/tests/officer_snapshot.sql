-- JOB CP step 0: read-only officer snapshot. Run before and after the officer
-- function change; the output (and its md5) must match the baseline byte for byte
-- (supabase/tests/officer_snapshot.baseline.txt). Ends with RAISE so nothing persists.
-- Dates: 1 Dec of each lodge year 2020-2027 (well inside an Installation year) and today.
DO $$
DECLARE
  s text := '';
  d date; dates date[]; u text := (SELECT min(id) FROM public.units);
  r record;
BEGIN
  dates := ARRAY(SELECT make_date(y, 12, 1) FROM generate_series(2020, 2027) y) || (now() AT TIME ZONE 'Europe/London')::date;
  -- 1. holders, with and without the unit argument
  FOR r IN SELECT key FROM public.officer_positions ORDER BY key LOOP
    FOREACH d IN ARRAY dates LOOP
      s := s || 'H|' || r.key || '|' || d || '|' || coalesce(public.current_officer_holder(r.key, d)::text, '-')
             || '|' || coalesce(public.current_officer_holder(r.key, d, u)::text, '-') || E'\n';
    END LOOP;
  END LOOP;
  -- 2. is_current_officer for each profile x each position they have ever held
  FOR r IN SELECT DISTINCT oa.member_id, oa.position_key FROM public.officer_appointments oa
           WHERE oa.member_id IS NOT NULL ORDER BY 1, 2 LOOP
    s := s || 'C|' || r.member_id || '|' || r.position_key || '|' || public.is_current_officer(r.member_id, r.position_key) || E'\n';
  END LOOP;
  -- 3. appointment rows read by the Installation / Provincial return builders
  FOR r IN SELECT position_key, member_id, lodge_year, is_projection, override_reason, display_name
           FROM public.officer_appointments ORDER BY position_key, lodge_year, member_id LOOP
    s := s || 'A|' || r.position_key || '|' || coalesce(r.member_id::text,'-') || '|' || r.lodge_year || '|' || r.is_projection
           || '|' || coalesce(r.override_reason,'-') || '|' || coalesce(r.display_name,'-') || E'\n';
  END LOOP;
  -- 4. return signers (WM + Secretary at each date, as returnSigners.ts resolves them)
  FOREACH d IN ARRAY dates LOOP
    s := s || 'S|' || d || '|' || coalesce(public.current_officer_holder('worshipful_master', d)::text,'-')
           || '|' || coalesce(public.current_officer_holder('secretary', d)::text,'-') || E'\n';
  END LOOP;
  -- 5. offices held per profile
  FOR r IN SELECT id FROM public.profiles ORDER BY id LOOP
    s := s || 'O|' || r.id || '|' || coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM public.get_member_offices_held(r.id) x)::text, '[]') || E'\n';
  END LOOP;
  RAISE EXCEPTION 'SNAPSHOT md5=% lines=% %', md5(s), (length(s) - length(replace(s, E'\n', ''))), E'\n' || s;
END $$;
