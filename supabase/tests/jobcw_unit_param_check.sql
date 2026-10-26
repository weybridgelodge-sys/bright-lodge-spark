-- JOB CW: two-lodge check for get_officers_public(_unit). Rolled back.
BEGIN;
INSERT INTO public.units(id, name) VALUES ('jobcw_b', 'Lodge B test');
-- lodge B's WM = an existing profile moved to lodge B is avoided; instead give lodge B its own WM appointment for a Weybridge member id.
DO $$
DECLARE wm text; a int; b int; u int; bl int; ay int; uy int;
BEGIN
  SELECT count(*) INTO a FROM public.get_officers_public(NULL, 'weybridge');
  SELECT count(*) INTO b FROM public.get_officers_public(NULL, 'jobcw_b');
  SELECT count(*) INTO u FROM public.get_officers_public(NULL, 'no_such_lodge');
  SELECT count(*) INTO bl FROM public.get_officers_public(NULL, '   ');
  ay := public.get_officers_public_year('weybridge');
  uy := public.get_officers_public_year('no_such_lodge');
  RAISE NOTICE 'A=% B=% unknown=% blank=% yearA=% yearUnknown=%', a, b, u, bl, ay, uy;
  IF a = 0 THEN RAISE EXCEPTION 'FAIL lodge A returned nothing'; END IF;
  IF b <> 0 THEN RAISE EXCEPTION 'FAIL lodge B saw lodge A officers'; END IF;
  IF u <> 0 OR bl <> 0 OR uy IS NOT NULL THEN RAISE EXCEPTION 'FAIL unknown/blank lodge returned rows'; END IF;
  IF public.get_public_booking_details('no_such_lodge') <> '{}'::jsonb THEN RAISE EXCEPTION 'FAIL booking details unknown lodge'; END IF;
  IF (SELECT count(*) FROM public.get_officers_public(NULL)) <> a THEN RAISE EXCEPTION 'FAIL no-arg differs'; END IF;
  RAISE NOTICE 'PASS 5/5';
END $$;
ROLLBACK;
