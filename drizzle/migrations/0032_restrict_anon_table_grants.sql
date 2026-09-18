DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','v','m')
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', r.relname);
  END LOOP;
END $$;

-- Public, logged-out website features that legitimately need anonymous reads
GRANT SELECT ON public.lodge_events TO anon;
GRANT SELECT ON public.lodge_event_courses TO anon;
GRANT SELECT ON public.lodge_event_dining_options TO anon;
GRANT SELECT ON public.venues TO anon;
GRANT SELECT ON public.charity_public_feed_metrics TO anon;
GRANT SELECT ON public.public_charity_totals TO anon;
GRANT SELECT ON public.public_charity_year_breakdown TO anon;
-- Underlying tables of the security_invoker charity view (rows still filtered by RLS)
GRANT SELECT ON public.charity_ledger TO anon;
GRANT SELECT ON public.charity_donations TO anon;
-- Public newsletter signup policy
GRANT INSERT ON public.newsletter_subscribers TO anon;