ALTER TABLE public.event_booking_payments
  ADD COLUMN IF NOT EXISTS manual_method text CHECK (manual_method IN ('cash','cheque','other')),
  ADD COLUMN IF NOT EXISTS note text CHECK (char_length(note) <= 500),
  ADD COLUMN IF NOT EXISTS reference text CHECK (char_length(reference) <= 100),
  ADD COLUMN IF NOT EXISTS recorded_by uuid,
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS event_booking_payments_request_uq
  ON public.event_booking_payments(request_id) WHERE request_id IS NOT NULL;