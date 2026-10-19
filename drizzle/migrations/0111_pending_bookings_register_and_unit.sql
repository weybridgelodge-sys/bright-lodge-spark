ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS unit_id text NOT NULL DEFAULT 'weybridge';

-- Register rows only for paid/confirmed (and other non-pending) bookings.
DROP TRIGGER IF EXISTS trg_sync_attendance_from_booking ON public.bookings;
CREATE TRIGGER trg_sync_attendance_from_booking
AFTER INSERT OR UPDATE OF meeting_id, payment_status, details ON public.bookings
FOR EACH ROW
WHEN (NEW.meeting_id IS NOT NULL AND NEW.payment_status NOT IN ('pending','failed'))
EXECUTE FUNCTION public.sync_attendance_from_booking();

CREATE OR REPLACE FUNCTION public.meeting_dependencies(_meeting_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE m public.festive_board_meetings;
BEGIN
  IF NOT public.can_manage_diary(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO m FROM public.festive_board_meetings WHERE id = _meeting_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meeting not found'; END IF;
  RETURN jsonb_build_object(
    'attendance', (SELECT count(*) FROM public.festive_board_attendance WHERE meeting_id = m.id),
    'bookings', (SELECT count(*) FROM public.bookings b WHERE (b.meeting_id = m.id OR (m.event_key IS NOT NULL AND b.event_key = m.event_key)) AND b.payment_status NOT IN ('pending','failed')),
    'summonses', (SELECT count(*) FROM public.summonses s WHERE s.meeting_date = m.meeting_date),
    'dining_invoices', (SELECT count(*) FROM public.treasurer_dining_invoices d WHERE d.meeting_id = m.id),
    'booking_page', (SELECT count(*) FROM public.lodge_events e WHERE m.event_key IS NOT NULL AND e.slug = m.event_key)
  );
END $function$;