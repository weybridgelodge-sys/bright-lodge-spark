
CREATE OR REPLACE FUNCTION public.sync_attendance_from_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meeting      public.festive_board_meetings%ROWTYPE;
  v_details      jsonb;
  v_opt          text;
  v_lodge        text;
  v_email        text;
  v_name         text;
  v_member_id    uuid;
  v_amount       integer;
  v_status       public.festive_attendance_status;
  v_guest        jsonb;
  v_guest_idx    int;
  v_guest_key    text;
  v_guest_lodge  text;
  v_guest_name   text;
  v_guest_member uuid;
BEGIN
  IF NEW.meeting_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_meeting FROM public.festive_board_meetings WHERE id = NEW.meeting_id;
  IF NOT FOUND OR v_meeting.is_white_table THEN RETURN NEW; END IF;

  v_details := COALESCE(NEW.details, '{}'::jsonb);
  v_opt     := COALESCE(v_details->>'meetingOption', '');
  v_lodge   := COALESCE(v_details->>'lodge', '');
  v_email   := lower(trim(COALESCE(NEW.contact_email, '')));
  v_name    := trim(COALESCE(NEW.contact_name, ''));

  IF v_opt = 'apologies' OR NEW.payment_status = 'apologies' THEN
    v_status := 'apologies'::public.festive_attendance_status;
    v_amount := 0;
  ELSE
    v_status := 'booked'::public.festive_attendance_status;
    v_amount := CASE WHEN v_opt = 'meeting-and-festive-board'
                     THEN COALESCE(v_meeting.dining_price_pence, 3500) ELSE 0 END;
  END IF;

  -- Respondent
  IF NOT EXISTS (
    SELECT 1 FROM public.festive_board_attendance
    WHERE meeting_id = NEW.meeting_id AND source_booking_id = NEW.id::text
  ) THEN
    v_member_id := NULL;
    IF (lower(v_lodge) LIKE '%weybridge%' OR v_lodge LIKE '%6787%') AND v_email <> '' THEN
      SELECT id INTO v_member_id FROM public.profiles
      WHERE lower(email) = v_email AND status = 'active' LIMIT 1;
    END IF;

    IF v_member_id IS NOT NULL THEN
      INSERT INTO public.festive_board_attendance (
        meeting_id, member_id, attendance_status, payment_method,
        amount_pence, source, source_booking_id
      ) VALUES (
        NEW.meeting_id, v_member_id, v_status, 'unknown'::public.festive_payment_method,
        v_amount, 'booking'::public.attendance_source, NEW.id::text
      );
    ELSE
      INSERT INTO public.festive_board_attendance (
        meeting_id, visitor_name, visitor_lodge_name, email,
        attendance_status, payment_method, amount_pence,
        source, source_booking_id
      ) VALUES (
        NEW.meeting_id,
        NULLIF(v_name, ''), NULLIF(v_lodge, ''), NULLIF(v_email, ''),
        v_status, 'unknown'::public.festive_payment_method, v_amount,
        'booking'::public.attendance_source, NEW.id::text
      );
    END IF;
  END IF;

  -- Guests
  IF jsonb_typeof(v_details->'guests') = 'array' THEN
    FOR v_guest_idx IN 0 .. (jsonb_array_length(v_details->'guests') - 1) LOOP
      v_guest := v_details->'guests'->v_guest_idx;
      v_guest_key := NEW.id::text || '::g' || v_guest_idx::text;
      v_guest_lodge := COALESCE(v_guest->>'lodge', '');
      v_guest_name  := trim(COALESCE(v_guest->>'name', ''));

      IF EXISTS (
        SELECT 1 FROM public.festive_board_attendance
        WHERE meeting_id = NEW.meeting_id AND source_booking_id = v_guest_key
      ) THEN CONTINUE; END IF;

      v_guest_member := NULL;
      IF lower(v_guest_lodge) LIKE '%weybridge%' OR v_guest_lodge LIKE '%6787%' THEN
        SELECT id INTO v_guest_member FROM public.profiles
        WHERE lower(full_name) = lower(v_guest_name) AND status = 'active' LIMIT 1;
      END IF;

      IF v_guest_member IS NOT NULL THEN
        INSERT INTO public.festive_board_attendance (
          meeting_id, member_id, attendance_status, payment_method,
          amount_pence, source, source_booking_id
        ) VALUES (
          NEW.meeting_id, v_guest_member, v_status, 'unknown'::public.festive_payment_method,
          v_amount, 'booking'::public.attendance_source, v_guest_key
        );
      ELSE
        INSERT INTO public.festive_board_attendance (
          meeting_id, visitor_name, visitor_lodge_name,
          attendance_status, payment_method, amount_pence,
          source, source_booking_id
        ) VALUES (
          NEW.meeting_id,
          NULLIF(v_guest_name, ''), NULLIF(v_guest_lodge, ''),
          v_status, 'unknown'::public.festive_payment_method, v_amount,
          'booking'::public.attendance_source, v_guest_key
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_attendance_from_booking ON public.bookings;
CREATE TRIGGER trg_sync_attendance_from_booking
AFTER INSERT OR UPDATE OF meeting_id, payment_status, details ON public.bookings
FOR EACH ROW
WHEN (NEW.meeting_id IS NOT NULL)
EXECUTE FUNCTION public.sync_attendance_from_booking();

-- Backfill: re-fire trigger for already-linked bookings
UPDATE public.bookings SET updated_at = updated_at WHERE meeting_id IS NOT NULL;
