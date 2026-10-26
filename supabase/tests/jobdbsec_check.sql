-- JOB DB-SEC check. Read-only; everything runs in a transaction that is rolled back.
-- Run as postgres (or another direct database session). Prints one row per check.
BEGIN;

-- 1. Grants on dues_calculate_amount (expect anon=false, authenticated=true, service_role=true).
SELECT 'grants dues_calculate_amount' AS check,
  has_function_privilege('anon', 'public.dues_calculate_amount(uuid,integer)', 'EXECUTE') AS anon,
  has_function_privilege('authenticated', 'public.dues_calculate_amount(uuid,integer)', 'EXECUTE') AS authenticated,
  has_function_privilege('service_role', 'public.dues_calculate_amount(uuid,integer)', 'EXECUTE') AS service_role;

-- 2. Grants on promote_next_waitlisted (not changed in this job; expect anon=true until a later job).
SELECT 'grants promote_next_waitlisted' AS check,
  has_function_privilege('anon', 'public.promote_next_waitlisted(text,uuid,integer)', 'EXECUTE') AS anon;

-- 3. Direct session: same figures as before (md5 over every profile, lodge year 2026).
SELECT 'direct session figures' AS check,
  md5(string_agg(public.dues_calculate_amount(id, 2026)::text, '|' ORDER BY id)) AS md5, count(*)
FROM public.profiles;

-- 4. Anon via the API (role anon, anon JWT claims): must be refused.
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$ BEGIN
  PERFORM public.dues_calculate_amount((SELECT gen_random_uuid()), 2026);
  RAISE NOTICE 'anon dues_calculate_amount: NOT REFUSED';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'anon dues_calculate_amount: refused (no execute)';
          WHEN others THEN RAISE NOTICE 'anon dues_calculate_amount: refused (%)', SQLERRM;
END $$;
RESET ROLE;

-- 5. Service role with service_role claims: same figures.
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT 'service_role figures' AS check,
  md5(string_agg(public.dues_calculate_amount(id, 2026)::text, '|' ORDER BY id)) AS md5, count(*)
FROM public.profiles;
RESET ROLE;

ROLLBACK;
