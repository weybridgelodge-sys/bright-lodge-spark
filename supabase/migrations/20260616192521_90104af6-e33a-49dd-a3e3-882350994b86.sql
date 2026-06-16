
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_key text NOT NULL,
  event_label text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal_pence integer NOT NULL DEFAULT 0,
  fee_pence integer NOT NULL DEFAULT 0,
  total_pence integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'gbp',
  payment_status text NOT NULL DEFAULT 'pending',
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  environment text NOT NULL DEFAULT 'sandbox',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_event_key ON public.bookings(event_key);
CREATE INDEX idx_bookings_email ON public.bookings(contact_email);
CREATE INDEX idx_bookings_session ON public.bookings(stripe_session_id);

GRANT SELECT, INSERT ON public.bookings TO anon;
GRANT SELECT, INSERT ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Anyone (guest or logged-in) can insert a booking
CREATE POLICY "Anyone can create a booking"
  ON public.bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Logged-in users can view bookings they own (user_id matches), 
-- OR bookings made under their email address
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR contact_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Admins and Secretary can view all bookings
CREATE POLICY "Admins and Secretary can view all bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'secretary')
  );

CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
