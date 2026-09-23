ALTER TABLE public.event_accounts ADD COLUMN IF NOT EXISTS promote_publicly boolean NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW public.public_lodge_meetings WITH (security_invoker = false) AS
  SELECT id, title, event_date, tyling_time, location, intro AS description
  FROM public.lodge_events WHERE published = true;

CREATE OR REPLACE VIEW public.public_officers_nights WITH (security_invoker = false) AS
  SELECT officer_night_date, COALESCE(officer_night_venue, 'Guildford Masonic Centre') AS venue
  FROM public.summonses
  WHERE officer_night_date IS NOT NULL AND status IN ('finalised','sent');

CREATE OR REPLACE VIEW public.public_ladies_festival_promo WITH (security_invoker = false) AS
  SELECT name, event_date FROM public.event_accounts
  WHERE promote_publicly = true AND name ILIKE '%ladies festival%';

REVOKE ALL ON public.public_lodge_meetings, public.public_officers_nights, public.public_ladies_festival_promo FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_lodge_meetings, public.public_officers_nights, public.public_ladies_festival_promo TO anon, authenticated;
GRANT ALL ON public.public_lodge_meetings, public.public_officers_nights, public.public_ladies_festival_promo TO service_role;