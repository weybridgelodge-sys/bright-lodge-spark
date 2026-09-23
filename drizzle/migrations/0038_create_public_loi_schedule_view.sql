CREATE VIEW public.public_loi_schedule WITH (security_invoker = false) AS
SELECT id, title, event_date, time_from, time_to, venue, description FROM public.loi_schedule_entries;
GRANT SELECT ON public.public_loi_schedule TO anon, authenticated;