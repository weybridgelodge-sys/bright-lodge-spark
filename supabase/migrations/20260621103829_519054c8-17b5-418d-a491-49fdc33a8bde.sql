
-- 1. Add the explicit is_meeting_only flag (separate from amount/payment_method)
ALTER TABLE public.festive_board_attendance
  ADD COLUMN IF NOT EXISTS is_meeting_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.festive_board_attendance.is_meeting_only IS
  'True when the brother attended the meeting only (no dining). Independent of amount_pence — a complimentary diner (e.g. PGM) still has is_meeting_only=false even though amount_pence=0.';

-- 2. Update the booking → attendance sync trigger to populate is_meeting_only
CREATE OR REPLACE FUNCTION public.sync_attendance_from_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_meeting      public.festive_board_meetings%ROWTYPE;
  v_details      jsonb;
  v_opt          text;
  v_lodge        text;
  v_email        text;
  v_name         text;
  v_first        text;
  v_last         text;
  v_member_id    uuid;
  v_amount       integer;
  v_status       public.festive_attendance_status;
  v_pay_raw      text;
  v_pay          public.festive_payment_method;
  v_meeting_only boolean;
  v_guest        jsonb;
  v_guest_idx    int;
  v_guest_key    text;
  v_guest_lodge  text;
  v_guest_name   text;
  v_guest_first  text;
  v_guest_last   text;
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
  v_first   := lower(trim(COALESCE(v_details->>'firstName', '')));
  v_last    := lower(trim(COALESCE(v_details->>'lastName', '')));
  v_pay_raw := lower(trim(COALESCE(v_details->>'paymentMethod', '')));

  v_pay := CASE v_pay_raw
    WHEN 'card'           THEN 'stripe'::public.festive_payment_method
    WHEN 'stripe'         THEN 'stripe'::public.festive_payment_method
    WHEN 'bank-transfer'  THEN 'bank_transfer'::public.festive_payment_method
    WHEN 'bank_transfer'  THEN 'bank_transfer'::public.festive_payment_method
    WHEN 'cash-cheque'    THEN 'paid_on_night_cash'::public.festive_payment_method
    WHEN 'cash'           THEN 'paid_on_night_cash'::public.festive_payment_method
    WHEN 'complimentary'  THEN 'complimentary'::public.festive_payment_method
    ELSE 'unknown'::public.festive_payment_method
  END;

  v_meeting_only := (v_opt = 'meeting-only');

  IF v_opt = 'apologies' OR NEW.payment_status = 'apologies' THEN
    v_status := 'apologies'::public.festive_attendance_status;
    v_amount := 0;
  ELSE
    v_status := 'booked'::public.festive_attendance_status;
    v_amount := CASE WHEN v_opt = 'meeting-and-festive-board'
                     THEN COALESCE(v_meeting.dining_price_pence, 3500) ELSE 0 END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.festive_board_attendance
    WHERE meeting_id = NEW.meeting_id AND source_booking_id = NEW.id::text
  ) THEN
    v_member_id := NULL;
    IF (lower(v_lodge) LIKE '%weybridge%' OR v_lodge LIKE '%6787%') THEN
      IF v_email <> '' THEN
        SELECT id INTO v_member_id FROM public.profiles
        WHERE lower(email) = v_email AND status = 'active' LIMIT 1;
      END IF;
      IF v_member_id IS NULL AND v_first <> '' AND v_last <> '' THEN
        SELECT id INTO v_member_id FROM public.profiles
        WHERE status = 'active'
          AND lower(trim(first_name)) = v_first
          AND lower(trim(last_name))  = v_last
        LIMIT 1;
      END IF;
      IF v_member_id IS NULL AND v_last <> '' THEN
        SELECT id INTO v_member_id FROM public.profiles
        WHERE status = 'active'
          AND lower(full_name) LIKE '%' || v_last || '%'
          AND (v_first = '' OR lower(full_name) LIKE '%' || v_first || '%')
        LIMIT 1;
      END IF;
    END IF;

    IF v_member_id IS NOT NULL THEN
      INSERT INTO public.festive_board_attendance (
        meeting_id, member_id, attendance_status, payment_method,
        amount_pence, is_meeting_only, source, source_booking_id
      ) VALUES (
        NEW.meeting_id, v_member_id, v_status, v_pay,
        v_amount, v_meeting_only, 'booking'::public.attendance_source, NEW.id::text
      );
    ELSE
      INSERT INTO public.festive_board_attendance (
        meeting_id, visitor_name, visitor_lodge_name, email,
        attendance_status, payment_method, amount_pence, is_meeting_only,
        source, source_booking_id
      ) VALUES (
        NEW.meeting_id,
        NULLIF(v_name, ''), NULLIF(v_lodge, ''), NULLIF(v_email, ''),
        v_status, v_pay, v_amount, v_meeting_only,
        'booking'::public.attendance_source, NEW.id::text
      );
    END IF;
  ELSE
    UPDATE public.festive_board_attendance
       SET payment_method = v_pay,
           amount_pence   = v_amount,
           attendance_status = v_status,
           is_meeting_only = v_meeting_only,
           updated_at = now()
     WHERE meeting_id = NEW.meeting_id AND source_booking_id = NEW.id::text;
  END IF;

  IF jsonb_typeof(v_details->'guests') = 'array' THEN
    FOR v_guest_idx IN 0 .. (jsonb_array_length(v_details->'guests') - 1) LOOP
      v_guest := v_details->'guests'->v_guest_idx;
      v_guest_key := NEW.id::text || '::g' || v_guest_idx::text;
      v_guest_lodge := COALESCE(v_guest->>'lodge', '');
      v_guest_name  := trim(COALESCE(v_guest->>'name', ''));
      v_guest_first := lower(split_part(regexp_replace(v_guest_name, '\s+', ' ', 'g'), ' ', 1));
      v_guest_last  := lower(split_part(regexp_replace(v_guest_name, '\s+', ' ', 'g'), ' ',
                          array_length(string_to_array(regexp_replace(v_guest_name, '\s+', ' ', 'g'), ' '), 1)));

      IF EXISTS (
        SELECT 1 FROM public.festive_board_attendance
        WHERE meeting_id = NEW.meeting_id AND source_booking_id = v_guest_key
      ) THEN
        UPDATE public.festive_board_attendance
           SET payment_method = v_pay,
               amount_pence   = v_amount,
               attendance_status = v_status,
               is_meeting_only = v_meeting_only,
               updated_at = now()
         WHERE meeting_id = NEW.meeting_id AND source_booking_id = v_guest_key;
        CONTINUE;
      END IF;

      v_guest_member := NULL;
      IF lower(v_guest_lodge) LIKE '%weybridge%' OR v_guest_lodge LIKE '%6787%' THEN
        IF v_guest_first <> '' AND v_guest_last <> '' THEN
          SELECT id INTO v_guest_member FROM public.profiles
          WHERE status = 'active'
            AND lower(trim(first_name)) = v_guest_first
            AND lower(trim(last_name))  = v_guest_last
          LIMIT 1;
        END IF;
        IF v_guest_member IS NULL AND v_guest_last <> '' THEN
          SELECT id INTO v_guest_member FROM public.profiles
          WHERE status = 'active'
            AND lower(full_name) LIKE '%' || v_guest_last || '%'
          LIMIT 1;
        END IF;
      END IF;

      IF v_guest_member IS NOT NULL THEN
        INSERT INTO public.festive_board_attendance (
          meeting_id, member_id, attendance_status, payment_method,
          amount_pence, is_meeting_only, source, source_booking_id
        ) VALUES (
          NEW.meeting_id, v_guest_member, v_status, v_pay,
          v_amount, v_meeting_only, 'booking'::public.attendance_source, v_guest_key
        );
      ELSE
        INSERT INTO public.festive_board_attendance (
          meeting_id, visitor_name, visitor_lodge_name,
          attendance_status, payment_method, amount_pence, is_meeting_only,
          source, source_booking_id
        ) VALUES (
          NEW.meeting_id,
          NULLIF(v_guest_name, ''), NULLIF(v_guest_lodge, ''),
          v_status, v_pay, v_amount, v_meeting_only,
          'booking'::public.attendance_source, v_guest_key
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Backfill is_meeting_only from existing booking-sourced rows
UPDATE public.festive_board_attendance a
SET is_meeting_only = true
FROM public.bookings b
WHERE a.source = 'booking'
  AND a.source_booking_id IS NOT NULL
  AND split_part(a.source_booking_id, '::', 1) = b.id::text
  AND lower(trim(COALESCE(b.details->>'meetingOption',''))) = 'meeting-only';
