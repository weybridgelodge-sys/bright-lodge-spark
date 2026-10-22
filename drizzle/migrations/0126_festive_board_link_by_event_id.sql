ALTER TABLE public.festive_board_meetings ADD COLUMN IF NOT EXISTS lodge_event_id uuid REFERENCES public.lodge_events(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS festive_board_meetings_lodge_event_id_key ON public.festive_board_meetings(lodge_event_id) WHERE lodge_event_id IS NOT NULL;
COMMENT ON COLUMN public.festive_board_meetings.event_key IS 'Derived: the linked lodge_events.slug (lodge_event_id), or an internal unlinked-<id> key. Never typed by a person.';

-- Backfill: link by the existing stored slug.
UPDATE public.festive_board_meetings m SET lodge_event_id = e.id
FROM public.lodge_events e WHERE e.slug = m.event_key AND m.lodge_event_id IS NULL;

-- event_key always follows the linked event; unlinked meetings get an internal key, never a public slug.
CREATE OR REPLACE FUNCTION public.tg_festive_board_derive_event_key()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _slug text;
BEGIN
  IF NEW.lodge_event_id IS NOT NULL THEN
    SELECT slug INTO _slug FROM public.lodge_events WHERE id = NEW.lodge_event_id;
    IF _slug IS NOT NULL THEN NEW.event_key := _slug; RETURN NEW; END IF;
    NEW.lodge_event_id := NULL;
  END IF;
  IF NEW.event_key IS NULL OR btrim(NEW.event_key) = ''
     OR (TG_OP = 'UPDATE' AND OLD.lodge_event_id IS NOT NULL AND NEW.event_key = OLD.event_key)
     OR EXISTS (SELECT 1 FROM public.lodge_events e WHERE e.slug = NEW.event_key) THEN
    NEW.event_key := 'unlinked-' || NEW.id::text;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_festive_board_derive_event_key ON public.festive_board_meetings;
CREATE TRIGGER trg_festive_board_derive_event_key BEFORE INSERT OR UPDATE OF lodge_event_id, event_key ON public.festive_board_meetings
FOR EACH ROW EXECUTE FUNCTION public.tg_festive_board_derive_event_key();

-- Event-side sync: find the meeting by id first, then old slug, then date; always record the id.
CREATE OR REPLACE FUNCTION public.sync_festive_board_from_lodge_event()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_meeting_id uuid;
  v_status public.meeting_status;
BEGIN
  v_status := CASE WHEN NEW.published THEN 'published'::public.meeting_status ELSE 'draft'::public.meeting_status END;

  IF NEW.published THEN
    UPDATE public.festive_board_meetings
    SET status = 'draft'::public.meeting_status, updated_at = now()
    WHERE status = 'published'::public.meeting_status
      AND lodge_event_id IS DISTINCT FROM NEW.id AND event_key <> NEW.slug;
  END IF;

  SELECT id INTO v_meeting_id FROM public.festive_board_meetings WHERE lodge_event_id = NEW.id LIMIT 1;
  IF v_meeting_id IS NULL THEN
    SELECT id INTO v_meeting_id FROM public.festive_board_meetings
    WHERE event_key = NEW.slug OR (TG_OP = 'UPDATE' AND event_key = OLD.slug) LIMIT 1;
  END IF;
  IF v_meeting_id IS NULL THEN
    SELECT id INTO v_meeting_id FROM public.festive_board_meetings
    WHERE meeting_date = NEW.event_date::date AND lodge_event_id IS NULL
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF v_meeting_id IS NULL THEN
    INSERT INTO public.festive_board_meetings (meeting_date, meeting_type, notes, event_key, lodge_event_id, status, is_white_table, dining_price_pence)
    VALUES (NEW.event_date::date, 'regular'::public.festive_meeting_type, NEW.title, NEW.slug, NEW.id, v_status, false, 3500)
    RETURNING id INTO v_meeting_id;
  ELSE
    UPDATE public.festive_board_meetings
    SET meeting_date = NEW.event_date::date,
        lodge_event_id = NEW.id,
        event_key = NEW.slug,
        status = CASE WHEN status = 'completed'::public.meeting_status AND NOT NEW.published
                      THEN 'completed'::public.meeting_status ELSE v_status END,
        updated_at = now()
    WHERE id = v_meeting_id;
  END IF;

  UPDATE public.bookings SET meeting_id = v_meeting_id, updated_at = now()
  WHERE meeting_id IS NULL AND event_key = NEW.slug;

  RETURN NEW;
END;
$function$;

-- Placeholder keys for new diary meetings: internal, not a public slug.
CREATE OR REPLACE FUNCTION public.diary_add_meeting(_date date, _type festive_meeting_type, _series_id uuid DEFAULT NULL::uuid, _notes text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE new_id uuid := gen_random_uuid();
BEGIN
  IF NOT public.can_manage_diary(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF EXISTS (SELECT 1 FROM public.festive_board_meetings WHERE meeting_date = _date AND cancelled_at IS NULL AND unit_id = public.current_unit_id()) THEN
    RAISE EXCEPTION 'A meeting already exists on %', _date;
  END IF;
  INSERT INTO public.festive_board_meetings(id, meeting_date, meeting_type, notes, status, event_key, series_id, created_by)
  VALUES (new_id, _date, _type, _notes, 'draft', 'unlinked-' || new_id::text, _series_id, auth.uid());
  IF _type = 'installation' THEN
    INSERT INTO public.officer_installation_dates(lodge_year, installation_date)
    VALUES (EXTRACT(YEAR FROM _date)::int, _date)
    ON CONFLICT (lodge_year) DO UPDATE SET installation_date = EXCLUDED.installation_date, updated_at = now();
  END IF;
  RETURN new_id;
END $function$;