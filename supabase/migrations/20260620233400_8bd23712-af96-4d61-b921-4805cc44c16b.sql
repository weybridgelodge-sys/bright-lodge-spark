DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.festive_board_meetings fb
    JOIN public.lodge_events le ON le.event_date::date = fb.meeting_date
    WHERE fb.event_key <> le.slug
      AND EXISTS (
        SELECT 1 FROM public.festive_board_meetings other
        WHERE other.event_key = le.slug AND other.id <> fb.id
      )
  ) THEN
    RAISE EXCEPTION 'Cannot relink Festive Board meeting: a target event slug is already used by another Festive Board record';
  END IF;
END $$;

UPDATE public.festive_board_meetings fb
SET event_key = le.slug,
    status = CASE WHEN le.published THEN 'published'::public.meeting_status ELSE fb.status END,
    updated_at = now()
FROM public.lodge_events le
WHERE le.event_date::date = fb.meeting_date
  AND (fb.event_key IS DISTINCT FROM le.slug OR (le.published AND fb.status <> 'published'::public.meeting_status));

UPDATE public.bookings b
SET meeting_id = fb.id,
    updated_at = now()
FROM public.festive_board_meetings fb
WHERE b.meeting_id IS NULL
  AND b.event_key = fb.event_key;

CREATE OR REPLACE FUNCTION public.sync_festive_board_from_lodge_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meeting_id uuid;
  v_status public.meeting_status;
BEGIN
  v_status := CASE WHEN NEW.published THEN 'published'::public.meeting_status ELSE 'draft'::public.meeting_status END;

  IF NEW.published THEN
    UPDATE public.festive_board_meetings
    SET status = 'draft'::public.meeting_status,
        updated_at = now()
    WHERE status = 'published'::public.meeting_status
      AND event_key <> NEW.slug;
  END IF;

  SELECT id INTO v_meeting_id
  FROM public.festive_board_meetings
  WHERE event_key = NEW.slug
  LIMIT 1;

  IF v_meeting_id IS NULL THEN
    SELECT id INTO v_meeting_id
    FROM public.festive_board_meetings
    WHERE meeting_date = NEW.event_date::date
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_meeting_id IS NULL THEN
    INSERT INTO public.festive_board_meetings (
      meeting_date,
      meeting_type,
      notes,
      event_key,
      status,
      is_white_table,
      dining_price_pence
    ) VALUES (
      NEW.event_date::date,
      'regular'::public.festive_meeting_type,
      NEW.title,
      NEW.slug,
      v_status,
      false,
      3500
    )
    RETURNING id INTO v_meeting_id;
  ELSE
    UPDATE public.festive_board_meetings
    SET meeting_date = NEW.event_date::date,
        event_key = NEW.slug,
        status = v_status,
        updated_at = now()
    WHERE id = v_meeting_id;
  END IF;

  UPDATE public.bookings
  SET meeting_id = v_meeting_id,
      updated_at = now()
  WHERE meeting_id IS NULL
    AND event_key = NEW.slug;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_festive_board_from_lodge_event ON public.lodge_events;
CREATE TRIGGER trg_sync_festive_board_from_lodge_event
AFTER INSERT OR UPDATE OF slug, event_date, published, title ON public.lodge_events
FOR EACH ROW
EXECUTE FUNCTION public.sync_festive_board_from_lodge_event();

CREATE OR REPLACE FUNCTION public.sync_lodge_event_from_festive_board()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET meeting_id = NEW.id,
      updated_at = now()
  WHERE meeting_id IS NULL
    AND event_key = NEW.event_key;

  UPDATE public.lodge_events
  SET published = (NEW.status = 'published'::public.meeting_status),
      updated_at = now()
  WHERE slug = NEW.event_key
    AND published IS DISTINCT FROM (NEW.status = 'published'::public.meeting_status);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lodge_event_from_festive_board ON public.festive_board_meetings;
CREATE TRIGGER trg_sync_lodge_event_from_festive_board
AFTER INSERT OR UPDATE OF event_key, status ON public.festive_board_meetings
FOR EACH ROW
EXECUTE FUNCTION public.sync_lodge_event_from_festive_board();