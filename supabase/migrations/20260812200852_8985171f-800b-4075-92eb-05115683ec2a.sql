CREATE OR REPLACE FUNCTION public.sync_festive_board_from_lodge_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        status = CASE
                   WHEN status = 'completed'::public.meeting_status AND NOT NEW.published
                     THEN 'completed'::public.meeting_status
                   ELSE v_status
                 END,
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
$function$;