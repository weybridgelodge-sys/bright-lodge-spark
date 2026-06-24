
-- Set view to run with definer rights so anon doesn't need access to underlying tables
ALTER VIEW public.public_charity_totals SET (security_invoker = off);

-- Grant public read access on the public-facing totals view
GRANT SELECT ON public.public_charity_totals TO anon, authenticated;
GRANT ALL ON public.public_charity_totals TO service_role;
