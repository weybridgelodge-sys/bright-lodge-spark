CREATE TABLE public.event_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_date date NOT NULL,
  status text NOT NULL DEFAULT 'planning',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.event_accounts(id) ON DELETE CASCADE,
  category text NOT NULL,
  planned_pence integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.event_accounts(id) ON DELETE CASCADE,
  payer_name text NOT NULL,
  ticket_count integer NOT NULL DEFAULT 1,
  is_placeholder boolean NOT NULL DEFAULT false,
  deposit_pence integer NOT NULL DEFAULT 0,
  deposit_paid boolean NOT NULL DEFAULT false,
  deposit_method text,
  balance_pence integer NOT NULL DEFAULT 0,
  balance_paid boolean NOT NULL DEFAULT false,
  balance_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  name text,
  seating_preference text,
  menu_choice text,
  allergies text,
  wine_preorder text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_lines ADD COLUMN event_id uuid REFERENCES public.event_accounts(id) ON DELETE SET NULL;
CREATE INDEX idx_journal_lines_event_id ON public.journal_lines(event_id);
CREATE INDEX idx_event_budget_lines_event ON public.event_budget_lines(event_id);
CREATE INDEX idx_event_bookings_event ON public.event_bookings(event_id);
CREATE INDEX idx_event_guests_booking ON public.event_guests(booking_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_accounts TO authenticated;
GRANT ALL ON public.event_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_budget_lines TO authenticated;
GRANT ALL ON public.event_budget_lines TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_bookings TO authenticated;
GRANT ALL ON public.event_bookings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_guests TO authenticated;
GRANT ALL ON public.event_guests TO service_role;

ALTER TABLE public.event_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_accounts_select ON public.event_accounts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role)
  OR is_current_officer(auth.uid(), 'treasurer') OR is_current_officer(auth.uid(), 'auditor_1')
  OR is_current_officer(auth.uid(), 'auditor_2') OR is_current_officer(auth.uid(), 'worshipful_master')
);
CREATE POLICY event_accounts_insert ON public.event_accounts FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));
CREATE POLICY event_accounts_update ON public.event_accounts FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));
CREATE POLICY event_accounts_delete ON public.event_accounts FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY event_budget_lines_select ON public.event_budget_lines FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.event_accounts e WHERE e.id = event_budget_lines.event_id));
CREATE POLICY event_budget_lines_insert ON public.event_budget_lines FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));
CREATE POLICY event_budget_lines_update ON public.event_budget_lines FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));
CREATE POLICY event_budget_lines_delete ON public.event_budget_lines FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY event_bookings_select ON public.event_bookings FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.event_accounts e WHERE e.id = event_bookings.event_id));
CREATE POLICY event_bookings_insert ON public.event_bookings FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));
CREATE POLICY event_bookings_update ON public.event_bookings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));
CREATE POLICY event_bookings_delete ON public.event_bookings FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY event_guests_select ON public.event_guests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.event_bookings b WHERE b.id = event_guests.booking_id));
CREATE POLICY event_guests_insert ON public.event_guests FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));
CREATE POLICY event_guests_update ON public.event_guests FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));
CREATE POLICY event_guests_delete ON public.event_guests FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE TRIGGER tg_event_accounts_updated_at BEFORE UPDATE ON public.event_accounts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_event_budget_lines_updated_at BEFORE UPDATE ON public.event_budget_lines FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_event_bookings_updated_at BEFORE UPDATE ON public.event_bookings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_event_guests_updated_at BEFORE UPDATE ON public.event_guests FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();