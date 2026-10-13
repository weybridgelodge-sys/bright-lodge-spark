CREATE OR REPLACE FUNCTION public.refresh_visitor_last_seen(_contact_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.visitor_contacts c
  SET last_seen_at = COALESCE((
    SELECT max(m.meeting_date)::timestamptz
    FROM public.visitor_attendances va
    JOIN public.festive_board_attendance a ON a.id = va.festive_board_attendance_id
    JOIN public.festive_board_meetings m ON m.id = a.meeting_id
    WHERE va.visitor_contact_id = c.id
      AND a.attendance_status::text IN ('booked','attended')
  ), c.first_seen_at)
  WHERE c.id = _contact_id;
$$;
REVOKE ALL ON FUNCTION public.refresh_visitor_last_seen(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tg_visitor_attendances_refresh_seen()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN PERFORM public.refresh_visitor_last_seen(NEW.visitor_contact_id); END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.visitor_contact_id IS DISTINCT FROM NEW.visitor_contact_id OR TG_OP = 'DELETE' THEN
    PERFORM public.refresh_visitor_last_seen(OLD.visitor_contact_id);
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS tg_visitor_attendances_refresh_seen ON public.visitor_attendances;
CREATE TRIGGER tg_visitor_attendances_refresh_seen AFTER INSERT OR UPDATE OR DELETE ON public.visitor_attendances
FOR EACH ROW EXECUTE FUNCTION public.tg_visitor_attendances_refresh_seen();

CREATE OR REPLACE FUNCTION public.tg_fba_status_refresh_seen()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid;
BEGIN
  SELECT visitor_contact_id INTO v FROM public.visitor_attendances WHERE festive_board_attendance_id = NEW.id;
  IF v IS NOT NULL THEN PERFORM public.refresh_visitor_last_seen(v); END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS tg_fba_status_refresh_seen ON public.festive_board_attendance;
CREATE TRIGGER tg_fba_status_refresh_seen AFTER UPDATE OF attendance_status, meeting_id ON public.festive_board_attendance
FOR EACH ROW WHEN (NEW.member_id IS NULL) EXECUTE FUNCTION public.tg_fba_status_refresh_seen();

COMMENT ON COLUMN public.visitor_contacts.last_seen_at IS 'Latest meeting date where a linked attendance row is booked/attended; falls back to first_seen_at. Maintained by refresh_visitor_last_seen triggers.';

SELECT public.refresh_visitor_last_seen(id) FROM public.visitor_contacts;