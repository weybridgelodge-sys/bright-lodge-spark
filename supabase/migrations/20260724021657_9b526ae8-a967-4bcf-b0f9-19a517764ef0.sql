ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS promoted_at timestamptz,
  ADD COLUMN IF NOT EXISTS promotion_notified_at timestamptz;