ALTER TABLE public.charity_festival_settings
  ADD COLUMN IF NOT EXISTS bronze_target_amount numeric,
  ADD COLUMN IF NOT EXISTS silver_target_amount numeric;