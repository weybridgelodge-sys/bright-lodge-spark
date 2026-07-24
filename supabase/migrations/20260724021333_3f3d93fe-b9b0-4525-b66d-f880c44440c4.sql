
-- 1. venues table
CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  dining_capacity integer NOT NULL CHECK (dining_capacity > 0),
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.venues TO anon, authenticated;
GRANT ALL ON public.venues TO service_role;

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read venues" ON public.venues FOR SELECT USING (true);
CREATE POLICY "Admins/secretary manage venues" ON public.venues FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'secretary'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'secretary'::public.app_role));

CREATE TRIGGER set_venues_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2. lodge_events venue_id
ALTER TABLE public.lodge_events ADD COLUMN venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL;
CREATE INDEX idx_lodge_events_venue_id ON public.lodge_events(venue_id);

-- 3. seed venue and link
INSERT INTO public.venues (name, dining_capacity, address)
VALUES ('Guildford Masonic Centre', 120, 'Hitherbury Close, Portsmouth Road, Guildford GU2 4DR');

UPDATE public.lodge_events
SET venue_id = (SELECT id FROM public.venues WHERE name = 'Guildford Masonic Centre' LIMIT 1);

-- 4. bookings: add waitlist-related columns
ALTER TABLE public.bookings ADD COLUMN promoted_from_waitlist boolean NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN promotion_notified_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN waitlist_refunded_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN stripe_refund_id text;

-- Rebuild uniqueness index so waitlisted rows are also unique per meeting/email
DROP INDEX IF EXISTS public.bookings_unique_non_card_per_meeting;
CREATE UNIQUE INDEX bookings_unique_status_per_meeting
  ON public.bookings (meeting_id, lower(contact_email), payment_status)
  WHERE meeting_id IS NOT NULL
    AND payment_status IN ('confirmed','apologies','waitlisted','waitlisted_refunded');

CREATE INDEX idx_bookings_waitlisted ON public.bookings (meeting_id, created_at)
  WHERE payment_status = 'waitlisted';

-- 5. helper: extract seat count from a booking row
CREATE OR REPLACE FUNCTION public.booking_seat_count(_details jsonb, _line_items jsonb)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT GREATEST(0, COALESCE(
    -- Prefer explicit seatsToCharge if present
    NULLIF((_details->>'seatsToCharge')::int, 0),
    -- Or 1 + guestCount when meeting-and-festive-board
    CASE
      WHEN (_details->>'meetingOption') = 'meeting-and-festive-board'
        THEN 1 + COALESCE((_details->>'guestCount')::int, 0)
      WHEN (_details->>'meetingOption') IN ('meeting-only','apologies') THEN 0
      ELSE
        -- Fallback: sum qty across line_items (Ladies Festival style bookings)
        COALESCE((
          SELECT SUM(COALESCE((li->>'qty')::int, 0))
          FROM jsonb_array_elements(COALESCE(_line_items,'[]'::jsonb)) li
        )::int, 0)
    END,
    0
  ))
$$;

-- 6. Atomic capacity check: returns 'confirmed' if seats fit, else 'waitlisted'.
-- Returns 'confirmed' unconditionally when the event has no venue configured.
CREATE OR REPLACE FUNCTION public.check_and_book_seats(
  _event_key text,
  _meeting_id uuid,
  _seats integer
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_venue_id uuid;
  v_capacity int;
  v_taken int;
BEGIN
  IF _seats IS NULL OR _seats <= 0 THEN
    RETURN 'confirmed';
  END IF;

  -- Resolve venue via event slug (source of truth)
  SELECT venue_id INTO v_venue_id
  FROM public.lodge_events WHERE slug = _event_key
  ORDER BY created_at DESC LIMIT 1;

  IF v_venue_id IS NULL THEN
    RETURN 'confirmed';
  END IF;

  SELECT dining_capacity INTO v_capacity
  FROM public.venues WHERE id = v_venue_id;

  IF v_capacity IS NULL THEN
    RETURN 'confirmed';
  END IF;

  -- Serialise seat checks for this event
  PERFORM pg_advisory_xact_lock(hashtextextended(_event_key || COALESCE(_meeting_id::text,''), 0));

  SELECT COALESCE(SUM(public.booking_seat_count(details, line_items)), 0)
    INTO v_taken
  FROM public.bookings
  WHERE event_key = _event_key
    AND (
      (_meeting_id IS NOT NULL AND meeting_id = _meeting_id)
      OR (_meeting_id IS NULL)
    )
    AND payment_status IN ('confirmed','paid');

  IF v_taken + _seats <= v_capacity THEN
    RETURN 'confirmed';
  ELSE
    RETURN 'waitlisted';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_book_seats(text, uuid, integer) TO anon, authenticated, service_role;

-- 7. Promote next waitlisted booking that fits in freed seats. Returns booking id or null.
CREATE OR REPLACE FUNCTION public.promote_next_waitlisted(
  _event_key text,
  _meeting_id uuid,
  _freed_seats integer
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_venue_id uuid;
  v_capacity int;
  v_taken int;
  v_available int;
  v_promoted uuid;
BEGIN
  IF _freed_seats IS NULL OR _freed_seats <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT venue_id INTO v_venue_id
  FROM public.lodge_events WHERE slug = _event_key
  ORDER BY created_at DESC LIMIT 1;
  IF v_venue_id IS NULL THEN RETURN NULL; END IF;

  SELECT dining_capacity INTO v_capacity FROM public.venues WHERE id = v_venue_id;
  IF v_capacity IS NULL THEN RETURN NULL; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_event_key || COALESCE(_meeting_id::text,''), 0));

  SELECT COALESCE(SUM(public.booking_seat_count(details, line_items)), 0)
    INTO v_taken
  FROM public.bookings
  WHERE event_key = _event_key
    AND (_meeting_id IS NULL OR meeting_id = _meeting_id)
    AND payment_status IN ('confirmed','paid');

  v_available := v_capacity - v_taken;
  IF v_available <= 0 THEN RETURN NULL; END IF;

  -- Find earliest waitlisted booking whose seats fit
  SELECT id INTO v_promoted
  FROM public.bookings
  WHERE event_key = _event_key
    AND (_meeting_id IS NULL OR meeting_id = _meeting_id)
    AND payment_status = 'waitlisted'
    AND public.booking_seat_count(details, line_items) <= v_available
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_promoted IS NULL THEN RETURN NULL; END IF;

  UPDATE public.bookings
  SET payment_status = 'confirmed',
      promoted_from_waitlist = true,
      updated_at = now()
  WHERE id = v_promoted;

  RETURN v_promoted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_next_waitlisted(text, uuid, integer) TO authenticated, service_role;

-- 8. Explicit promote-by-id for admin override
CREATE OR REPLACE FUNCTION public.promote_waitlisted_by_id(_booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::public.app_role)
       OR public.has_role(auth.uid(),'secretary'::public.app_role)
       OR public.has_role(auth.uid(),'worshipful_master'::public.app_role)) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  SELECT payment_status INTO v_status FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF v_status IS DISTINCT FROM 'waitlisted' THEN RETURN false; END IF;

  UPDATE public.bookings
  SET payment_status = 'confirmed',
      promoted_from_waitlist = true,
      updated_at = now()
  WHERE id = _booking_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_waitlisted_by_id(uuid) TO authenticated, service_role;

-- 9. Auto-promotion trigger: when a booking moves out of confirmed/paid → free seats
CREATE OR REPLACE FUNCTION public.tg_bookings_auto_promote()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_freed int;
  v_promoted uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.payment_status IN ('confirmed','paid') AND OLD.meeting_id IS NOT NULL THEN
      v_freed := public.booking_seat_count(OLD.details, OLD.line_items);
      IF v_freed > 0 THEN
        v_promoted := public.promote_next_waitlisted(OLD.event_key, OLD.meeting_id, v_freed);
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.payment_status IN ('confirmed','paid')
     AND NEW.payment_status NOT IN ('confirmed','paid')
     AND OLD.meeting_id IS NOT NULL THEN
    v_freed := public.booking_seat_count(NEW.details, NEW.line_items);
    IF v_freed > 0 THEN
      v_promoted := public.promote_next_waitlisted(NEW.event_key, NEW.meeting_id, v_freed);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_auto_promote ON public.bookings;
CREATE TRIGGER trg_bookings_auto_promote
AFTER UPDATE OF payment_status OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_bookings_auto_promote();

-- 10. Capacity/waitlist summary RPC for admin UI
CREATE OR REPLACE FUNCTION public.event_capacity_summary(_meeting_id uuid)
RETURNS TABLE(capacity int, taken int, waitlisted_seats int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH m AS (
    SELECT event_key FROM public.festive_board_meetings WHERE id = _meeting_id
  ),
  v AS (
    SELECT v.dining_capacity
    FROM public.lodge_events e
    JOIN public.venues v ON v.id = e.venue_id
    WHERE e.slug = (SELECT event_key FROM m)
    ORDER BY e.created_at DESC LIMIT 1
  )
  SELECT
    COALESCE((SELECT dining_capacity FROM v), 0) AS capacity,
    COALESCE((SELECT SUM(public.booking_seat_count(details, line_items))::int
              FROM public.bookings
              WHERE meeting_id = _meeting_id
                AND payment_status IN ('confirmed','paid')), 0) AS taken,
    COALESCE((SELECT SUM(public.booking_seat_count(details, line_items))::int
              FROM public.bookings
              WHERE meeting_id = _meeting_id
                AND payment_status = 'waitlisted'), 0) AS waitlisted_seats;
$$;

GRANT EXECUTE ON FUNCTION public.event_capacity_summary(uuid) TO authenticated, service_role;
