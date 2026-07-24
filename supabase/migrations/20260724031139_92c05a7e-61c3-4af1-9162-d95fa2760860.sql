ALTER TABLE public.summonses
  ADD COLUMN IF NOT EXISTS visitors_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS visitors_notified_count integer DEFAULT 0;