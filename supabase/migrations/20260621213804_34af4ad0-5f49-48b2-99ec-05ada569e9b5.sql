ALTER TABLE public.charity_donations
  ADD COLUMN IF NOT EXISTS match_funding_amount numeric(10,2) NOT NULL DEFAULT 0
  CHECK (match_funding_amount >= 0);