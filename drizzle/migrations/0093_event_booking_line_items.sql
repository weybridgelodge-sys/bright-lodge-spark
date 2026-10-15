CREATE OR REPLACE VIEW public.public_events AS
SELECT id, slug, COALESCE(public_title, name) AS public_title, name, tagline, intro_copy, theme, event_date, start_time, end_time, venue,
  booking_deadline, capacity, adult_price_pence, child_price_pence, hosting_lodges, highlights, dress_code,
  (SELECT COALESCE(sum(b.adult_count + b.child_count), 0)::integer FROM public.event_bookings b
    WHERE b.event_id = e.id AND b.source = 'public'
      AND public.event_booking_holds_seat(b.payment_status, b.payment_method, b.created_at)) AS seats_taken,
  useful_stuff, menu_items, dietary_choices,
  event_type, modules, payment_mode, deposit_percent, balance_due_date, fee_cover_enabled,
  seo_title, seo_description, og_image_url
FROM public.event_accounts e
WHERE is_public = true AND slug IS NOT NULL AND archived_at IS NULL;
GRANT SELECT ON public.public_events TO anon, authenticated;

ALTER TABLE public.event_bookings
  ADD COLUMN IF NOT EXISTS payment_plan text NOT NULL DEFAULT 'full'
    CHECK (payment_plan IN ('full','deposit')),
  ADD COLUMN IF NOT EXISTS tickets_subtotal_pence integer CHECK (tickets_subtotal_pence IS NULL OR tickets_subtotal_pence >= 0),
  ADD COLUMN IF NOT EXISTS items_subtotal_pence integer NOT NULL DEFAULT 0 CHECK (items_subtotal_pence >= 0);

CREATE TABLE public.event_booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.event_accounts(id) ON DELETE CASCADE,
  catalogue_item_id uuid REFERENCES public.event_catalogue_items(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('drink','voucher')),
  category_name text,
  name_snapshot text NOT NULL,
  unit_note_snapshot text,
  unit_price_pence integer NOT NULL CHECK (unit_price_pence >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total_pence integer GENERATED ALWAYS AS (unit_price_pence * quantity) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_booking_items_booking_idx ON public.event_booking_items(booking_id);
CREATE INDEX event_booking_items_event_idx ON public.event_booking_items(event_id);

CREATE TABLE public.event_guest_course_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES public.event_guests(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.event_accounts(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.event_courses(id) ON DELETE SET NULL,
  option_id uuid REFERENCES public.event_course_options(id) ON DELETE SET NULL,
  course_name_snapshot text NOT NULL,
  option_label_snapshot text,
  decide_later boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (decide_later OR option_id IS NOT NULL OR option_label_snapshot IS NOT NULL),
  UNIQUE (guest_id, course_id)
);
CREATE INDEX event_guest_course_choices_booking_idx ON public.event_guest_course_choices(booking_id);
CREATE INDEX event_guest_course_choices_event_idx ON public.event_guest_course_choices(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_booking_items, public.event_guest_course_choices TO authenticated;
GRANT ALL ON public.event_booking_items, public.event_guest_course_choices TO service_role;

ALTER TABLE public.event_booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_guest_course_choices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event staff read booking items" ON public.event_booking_items FOR SELECT TO authenticated
  USING (public.can_read_event_content(auth.uid()));
CREATE POLICY "Event staff write booking items" ON public.event_booking_items FOR ALL TO authenticated
  USING (public.can_write_event_content(auth.uid())) WITH CHECK (public.can_write_event_content(auth.uid()));
CREATE POLICY "Event staff read course choices" ON public.event_guest_course_choices FOR SELECT TO authenticated
  USING (public.can_read_event_content(auth.uid()));
CREATE POLICY "Event staff write course choices" ON public.event_guest_course_choices FOR ALL TO authenticated
  USING (public.can_write_event_content(auth.uid())) WITH CHECK (public.can_write_event_content(auth.uid()));

CREATE OR REPLACE FUNCTION public.event_booking_child_match() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.event_bookings b WHERE b.id = NEW.booking_id AND b.event_id = NEW.event_id) THEN
    RAISE EXCEPTION 'Booking does not belong to this event';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER event_booking_items_match BEFORE INSERT OR UPDATE ON public.event_booking_items
  FOR EACH ROW EXECUTE FUNCTION public.event_booking_child_match();
CREATE TRIGGER event_guest_course_choices_match BEFORE INSERT OR UPDATE ON public.event_guest_course_choices
  FOR EACH ROW EXECUTE FUNCTION public.event_booking_child_match();