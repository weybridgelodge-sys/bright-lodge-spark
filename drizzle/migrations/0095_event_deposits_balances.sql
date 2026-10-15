CREATE TABLE public.event_booking_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('full','deposit','balance')),
  method text NOT NULL CHECK (method IN ('card','pay_by_bank','bank_transfer','manual')),
  amount_pence integer NOT NULL CHECK (amount_pence >= 0),
  fee_pence integer NOT NULL DEFAULT 0 CHECK (fee_pence >= 0),
  refunded_pence integer NOT NULL DEFAULT 0 CHECK (refunded_pence >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','refunded','failed')),
  stripe_session_id text,
  stripe_payment_intent_id text,
  stripe_fee_pence integer,
  stripe_net_pence integer,
  stripe_other_fees_pence integer NOT NULL DEFAULT 0,
  stripe_balance_transaction_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_booking_payments_booking_idx ON public.event_booking_payments(booking_id);
CREATE UNIQUE INDEX event_booking_payments_session_uq ON public.event_booking_payments(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX event_booking_payments_pi_idx ON public.event_booking_payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
GRANT SELECT ON public.event_booking_payments TO authenticated;
GRANT ALL ON public.event_booking_payments TO service_role;
ALTER TABLE public.event_booking_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event finance readers can view payments" ON public.event_booking_payments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.event_bookings b WHERE b.id = booking_id));

ALTER TABLE public.event_bookings
  ADD COLUMN IF NOT EXISTS amount_paid_pence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due_pence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fees_paid_pence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_pence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due_date date;

CREATE TABLE public.event_booking_balance_tokens (
  booking_id uuid PRIMARY KEY REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE CHECK (length(token) >= 40),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.event_booking_balance_tokens TO service_role;
ALTER TABLE public.event_booking_balance_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.event_booking_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('balance_14d','balance_3d','choices')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, kind)
);
GRANT SELECT ON public.event_booking_reminders TO authenticated;
GRANT ALL ON public.event_booking_reminders TO service_role;
ALTER TABLE public.event_booking_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event finance readers can view reminders" ON public.event_booking_reminders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.event_bookings b WHERE b.id = booking_id));

INSERT INTO public.event_booking_payments
  (booking_id, kind, method, amount_pence, fee_pence, status, stripe_session_id,
   stripe_payment_intent_id, stripe_fee_pence, stripe_net_pence, stripe_other_fees_pence,
   stripe_balance_transaction_id, paid_at, created_at)
SELECT b.id, 'full',
       CASE WHEN b.payment_method IN ('card','pay_by_bank','bank_transfer') THEN b.payment_method ELSE 'manual' END,
       GREATEST(0, COALESCE(b.subtotal_pence, b.total_pence - COALESCE(b.fee_pence,0), 0)),
       COALESCE(b.fee_pence,0),
       CASE WHEN b.payment_status = 'paid' THEN 'paid' ELSE 'pending' END,
       b.stripe_session_id, b.stripe_payment_intent_id, b.stripe_fee_pence, b.stripe_net_pence,
       COALESCE(b.stripe_other_fees_pence,0), b.stripe_balance_transaction_id, b.paid_at, b.created_at
FROM public.event_bookings b
WHERE b.source = 'public'
  AND NOT EXISTS (SELECT 1 FROM public.event_booking_payments p WHERE p.booking_id = b.id);

UPDATE public.event_bookings b SET
  amount_paid_pence = CASE WHEN b.payment_status = 'paid' THEN GREATEST(0, COALESCE(b.subtotal_pence, b.total_pence - COALESCE(b.fee_pence,0), 0)) ELSE 0 END,
  fees_paid_pence = CASE WHEN b.payment_status = 'paid' THEN COALESCE(b.fee_pence,0) ELSE 0 END,
  balance_due_pence = CASE WHEN b.payment_status = 'paid' THEN 0 ELSE GREATEST(0, COALESCE(b.subtotal_pence, b.total_pence - COALESCE(b.fee_pence,0), 0)) END
WHERE b.source = 'public';

CREATE OR REPLACE FUNCTION public.event_booking_holds_seat(_status text, _method text, _created timestamptz)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT _status IN ('paid','deposit_paid')
      OR (_status = 'pending' AND (_method = 'bank_transfer' OR _created > now() - interval '30 minutes'))
$$;

COMMENT ON COLUMN public.event_bookings.deposit_pence IS 'DEPRECATED for public bookings: see event_booking_payments';
COMMENT ON COLUMN public.event_bookings.balance_pence IS 'DEPRECATED for public bookings: see balance_due_pence';