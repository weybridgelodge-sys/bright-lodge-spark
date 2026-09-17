CREATE OR REPLACE FUNCTION public.tg_visitor_contact_upsert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_name text;
  v_lodge text;
  v_number text;
  v_contact_id uuid;
  v_seen timestamptz;
BEGIN
  IF NEW.member_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_email  := NULLIF(lower(trim(COALESCE(NEW.email, ''))), '');
  v_name   := NULLIF(trim(COALESCE(NEW.visitor_name, '')), '');
  v_lodge  := NULLIF(trim(COALESCE(NEW.visitor_lodge_name, '')), '');
  v_number := NULLIF(trim(COALESCE(NEW.visitor_lodge_number, '')), '');

  IF v_email IS NULL AND v_name IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT m.meeting_date::timestamptz INTO v_seen
  FROM public.festive_board_meetings m
  WHERE m.id = NEW.meeting_id;

  v_seen := COALESCE(v_seen, now());

  IF v_email IS NOT NULL THEN
    INSERT INTO public.visitor_contacts (email, name, lodge_name, lodge_number, last_seen_at)
    VALUES (v_email, v_name, v_lodge, v_number, v_seen)
    ON CONFLICT (email) DO UPDATE
      SET
        name = COALESCE(NULLIF(public.visitor_contacts.name, ''), EXCLUDED.name),
        lodge_name = COALESCE(NULLIF(public.visitor_contacts.lodge_name, ''), EXCLUDED.lodge_name),
        lodge_number = COALESCE(NULLIF(public.visitor_contacts.lodge_number, ''), EXCLUDED.lodge_number),
        last_seen_at = GREATEST(COALESCE(public.visitor_contacts.last_seen_at, EXCLUDED.last_seen_at), EXCLUDED.last_seen_at)
    RETURNING id INTO v_contact_id;
  ELSE
    SELECT c.id INTO v_contact_id
    FROM public.visitor_contacts c
    WHERE c.email IS NULL
      AND lower(trim(c.name)) = lower(v_name)
      AND COALESCE(lower(trim(c.lodge_name)), '') = COALESCE(lower(v_lodge), '')
    ORDER BY c.created_at
    LIMIT 1;

    IF v_contact_id IS NULL THEN
      INSERT INTO public.visitor_contacts (email, name, lodge_name, lodge_number, last_seen_at)
      VALUES (NULL, v_name, v_lodge, v_number, v_seen)
      RETURNING id INTO v_contact_id;
    ELSE
      UPDATE public.visitor_contacts
      SET lodge_number = COALESCE(NULLIF(lodge_number, ''), v_number),
          lodge_name   = COALESCE(NULLIF(lodge_name, ''), v_lodge),
          last_seen_at = GREATEST(COALESCE(last_seen_at, v_seen), v_seen)
      WHERE id = v_contact_id;
    END IF;
  END IF;

  INSERT INTO public.visitor_attendances (visitor_contact_id, festive_board_attendance_id)
  VALUES (v_contact_id, NEW.id)
  ON CONFLICT (festive_board_attendance_id) DO UPDATE
    SET visitor_contact_id = EXCLUDED.visitor_contact_id;

  RETURN NEW;
END;
$function$;