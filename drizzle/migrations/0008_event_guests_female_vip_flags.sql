ALTER TABLE public.event_guests
  ADD COLUMN IF NOT EXISTS is_female boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_vip boolean NOT NULL DEFAULT false;