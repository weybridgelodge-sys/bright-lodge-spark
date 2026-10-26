-- JOB DB1 check (rolled back). Run as postgres. Expects exactly one lodge row in units.
BEGIN;
WITH one AS (SELECT id FROM public.units LIMIT 1)
SELECT 'join_us no-arg = explicit', (SELECT json_agg(x)::text FROM public.get_join_us_costs() x) IS NOT DISTINCT FROM (SELECT json_agg(x)::text FROM public.get_join_us_costs((SELECT id FROM one)) x)
UNION ALL SELECT 'join_us unknown empty', NOT EXISTS (SELECT 1 FROM public.get_join_us_costs('no-such-lodge'))
UNION ALL SELECT 'join_us blank empty', NOT EXISTS (SELECT 1 FROM public.get_join_us_costs('  '))
UNION ALL SELECT 'pattern no-arg = explicit', public.get_meeting_pattern() = public.get_meeting_pattern((SELECT id FROM one))
UNION ALL SELECT 'pattern unknown {}', public.get_meeting_pattern('no-such-lodge') = '{}'::jsonb
UNION ALL SELECT 'figures no-arg = explicit', public.get_public_lodge_figures() = public.get_public_lodge_figures((SELECT id FROM one))
UNION ALL SELECT 'figures unknown {}', public.get_public_lodge_figures('no-such-lodge') = '{}'::jsonb
UNION ALL SELECT 'profile no-arg = explicit', public.get_public_unit_profile() = public.get_public_unit_profile((SELECT id FROM one))
UNION ALL SELECT 'profile unknown {}', public.get_public_unit_profile('no-such-lodge') = '{}'::jsonb
UNION ALL SELECT 'identity old signature gone', NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname IN ('get_join_us_costs','get_meeting_pattern','get_public_lodge_figures','get_public_unit_profile','get_lodge_identity') AND pronargs = 0);
-- get_lodge_identity needs an active signed-in member; not callable meaningfully as postgres.
ROLLBACK;
