ALTER TABLE public.lodge_events
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid;

CREATE OR REPLACE FUNCTION public.tg_lodge_events_archive_stamp()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    NEW.archived_by := CASE WHEN NEW.archived_at IS NULL THEN NULL ELSE auth.uid() END;
  ELSE
    NEW.archived_by := OLD.archived_by;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_lodge_events_archive_stamp ON public.lodge_events;
CREATE TRIGGER trg_lodge_events_archive_stamp BEFORE UPDATE ON public.lodge_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_lodge_events_archive_stamp();

CREATE OR REPLACE FUNCTION public.is_event_key_archived(_event_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.lodge_events e WHERE e.slug = _event_key AND e.archived_at IS NOT NULL)
$$;

DROP POLICY IF EXISTS "Public can read published events" ON public.lodge_events;
CREATE POLICY "Public can read published events" ON public.lodge_events
  FOR SELECT USING (published = true AND archived_at IS NULL);

CREATE OR REPLACE VIEW public.public_lodge_meetings WITH (security_invoker = false) AS
  SELECT id, title, event_date, tyling_time, location, intro AS description
  FROM public.lodge_events WHERE published = true AND archived_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_next_public_meeting()
 RETURNS TABLE(meeting_date date, ceremony text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT m.meeting_date,
    (SELECT CASE WHEN c ~* '(initiation|passing|raising|installation|ceremony|festive|ladies|white table|emergency)' THEN c ELSE NULL END
       FROM (SELECT btrim(regexp_replace(coalesce(m.notes, ''), '^[^-–—]*[-–—]\s*', '')) AS c) s) AS ceremony
  FROM public.festive_board_meetings m
  WHERE m.meeting_date >= (now() AT TIME ZONE 'Europe/London')::date
    AND m.status <> 'completed'
    AND NOT public.is_event_key_archived(m.event_key)
  ORDER BY m.meeting_date ASC LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_upcoming_public_meetings()
 RETURNS TABLE(meeting_date date, ceremony text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT m.meeting_date,
    (SELECT CASE WHEN c ~* '(initiation|passing|raising|installation|ceremony|festive|ladies|white table|emergency)' THEN c ELSE NULL END
       FROM (SELECT btrim(regexp_replace(coalesce(m.notes, ''), '^[^-–—]*[-–—]\s*', '')) AS c) s) AS ceremony
  FROM public.festive_board_meetings m
  WHERE m.meeting_date >= (now() AT TIME ZONE 'Europe/London')::date
    AND m.status <> 'completed'
    AND NOT public.is_event_key_archived(m.event_key)
  ORDER BY m.meeting_date ASC;
$function$;

CREATE OR REPLACE FUNCTION public.get_published_meeting_for_event(_event_key text)
 RETURNS TABLE(id uuid, event_key text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT m.id, m.event_key FROM public.festive_board_meetings m
  WHERE m.event_key = _event_key AND m.status = 'published'::public.meeting_status
    AND NOT public.is_event_key_archived(m.event_key)
  LIMIT 1;
$function$;