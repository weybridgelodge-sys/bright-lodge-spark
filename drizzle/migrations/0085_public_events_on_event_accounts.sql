ALTER TABLE public.event_accounts
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS public_title text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS intro_copy text,
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'default' CHECK (theme IN ('christmas','default')),
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS venue text DEFAULT 'Guildford Masonic Centre, Hitherbury Close, Guildford GU2 4DR',
  ADD COLUMN IF NOT EXISTS booking_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS capacity integer CHECK (capacity IS NULL OR capacity >= 0),
  ADD COLUMN IF NOT EXISTS adult_price_pence integer CHECK (adult_price_pence IS NULL OR adult_price_pence >= 0),
  ADD COLUMN IF NOT EXISTS child_price_pence integer CHECK (child_price_pence IS NULL OR child_price_pence >= 0),
  ADD COLUMN IF NOT EXISTS hosting_lodges text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dress_code text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reference_prefix text,
  ADD COLUMN IF NOT EXISTS statement_descriptor text CHECK (statement_descriptor IS NULL OR char_length(statement_descriptor) <= 22),
  ADD COLUMN IF NOT EXISTS events_notify_email text;

ALTER TABLE public.event_bookings
  ADD COLUMN IF NOT EXISTS reference text UNIQUE,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS lodge_label text,
  ADD COLUMN IF NOT EXISTS adult_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS child_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_pence integer,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS bank_instructions jsonb,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_token uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.event_guests
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS is_child boolean NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW public.public_events
WITH (security_invoker = false) AS
SELECT id, slug, COALESCE(public_title, name) AS public_title, name, tagline, intro_copy, theme,
       event_date, start_time, end_time, venue, booking_deadline, capacity,
       adult_price_pence, child_price_pence, hosting_lodges, highlights, dress_code,
       (SELECT COALESCE(sum(b.adult_count + b.child_count),0)::int FROM public.event_bookings b
          WHERE b.event_id = e.id AND b.source = 'public' AND b.payment_status <> 'cancelled') AS seats_taken
FROM public.event_accounts e
WHERE is_public = true AND slug IS NOT NULL;

GRANT SELECT ON public.public_events TO anon, authenticated;