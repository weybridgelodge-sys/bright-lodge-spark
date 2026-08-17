ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stripe_fee_pence integer,
  ADD COLUMN IF NOT EXISTS stripe_net_pence integer,
  ADD COLUMN IF NOT EXISTS stripe_balance_transaction_id text;

COMMENT ON COLUMN public.bookings.stripe_fee_pence IS 'Actual processing fee deducted by Stripe (from the charge balance transaction), distinct from fee_pence which is what was charged to the payer.';