ALTER TABLE public.summonses
  ADD COLUMN IF NOT EXISTS dining_menu text,
  ADD COLUMN IF NOT EXISTS dining_price text,
  ADD COLUMN IF NOT EXISTS dining_deadline date;