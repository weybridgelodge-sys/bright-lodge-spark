-- Job BW: unit-aware member matching and officer lookup; drop host-lodge default on bookings.unit_id.
-- Old signatures are dropped (not overloaded) so existing 2-argument calls stay unambiguous.
-- No attendance rows are touched; the trigger only affects future bookings.

DROP FUNCTION public.booking_name_member_suspect(text, text);
CREATE FUNCTION public.booking_name_member_suspect(_first text, _last text, _unit text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN count(*) = 1 THEN (array_agg(id))[1] END
  FROM public.profiles
  WHERE status = 'active'
    AND coalesce(trim(_first), '') <> '' AND coalesce(trim(_last), '') <> ''
    AND (coalesce(_unit, '') = '' OR unit_id = _unit)
    AND lower(trim(last_name)) = lower(trim(_last))
    AND (lower(trim(first_name)) = lower(trim(_first))
         OR lower(trim(coalesce(preferred_name, ''))) = lower(trim(_first)));
$function$;
REVOKE ALL ON FUNCTION public.booking_name_member_suspect(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.booking_name_member_suspect(text, text, text) TO service_role;

DROP FUNCTION public.current_officer_holder(text, date);
CREATE FUNCTION public.current_officer_holder(_position_key text, _at date DEFAULT NULL::date, _unit text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT oa.member_id
  FROM public.officer_appointments oa
  LEFT JOIN public.officer_positions op ON op.key = oa.position_key
  WHERE oa.position_key = _position_key AND NOT oa.is_projection AND oa.member_id IS NOT NULL
    AND (coalesce(_unit, '') = '' OR op.unit_id = _unit)
    AND public.officer_appointment_effective(oa.lodge_year, oa.appointed_on, COALESCE(op.is_progressive, false))
        <= COALESCE(_at, (now() AT TIME ZONE 'Europe/London')::date)
  ORDER BY oa.lodge_year DESC, oa.updated_at DESC
  LIMIT 1
$function$;
GRANT EXECUTE ON FUNCTION public.current_officer_holder(text, date, text) TO PUBLIC, anon, authenticated, service_role;

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
  v_suspect      uuid;
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
    -- Email match links whatever title/lodge text was typed; a name-only
    -- match is never linked, only flagged for the Secretary.
    v_member_id := NULL;
    v_suspect := NULL;
    IF v_email <> '' THEN
      SELECT id INTO v_member_id FROM public.profiles
      WHERE lower(trim(email)) = v_email AND status = 'active'
        AND (coalesce(v_meeting.unit_id, '') = '' OR unit_id = v_meeting.unit_id) LIMIT 1;
    END IF;
    IF v_member_id IS NULL THEN
      v_suspect := public.booking_name_member_suspect(v_first, v_last, v_meeting.unit_id);
    END IF;

    IF v_member_id IS NOT NULL THEN
      INSERT INTO public.festive_board_attendance (
        meeting_id, member_id, attendance_status, payment_method,
        amount_pence, is_meeting_only, source, source_booking_id
      ) VALUES (
        NEW.meeting_id, v_member_id, v_status, v_pay,
        v_amount, v_meeting_only, 'booking'::public.attendance_source, NEW.id::text
      )
      ON CONFLICT (meeting_id, member_id) WHERE member_id IS NOT NULL
      DO UPDATE SET
        attendance_status = EXCLUDED.attendance_status,
        payment_method    = EXCLUDED.payment_method,
        amount_pence      = EXCLUDED.amount_pence,
        is_meeting_only   = EXCLUDED.is_meeting_only,
        source            = EXCLUDED.source,
        source_booking_id = EXCLUDED.source_booking_id,
        updated_at        = now();
    ELSE
      INSERT INTO public.festive_board_attendance (
        meeting_id, visitor_name, visitor_lodge_name, email,
        attendance_status, payment_method, amount_pence, is_meeting_only,
        source, source_booking_id, suspected_member_id
      ) VALUES (
        NEW.meeting_id,
        NULLIF(v_name, ''), NULLIF(v_lodge, ''), NULLIF(v_email, ''),
        v_status, v_pay, v_amount, v_meeting_only,
        'booking'::public.attendance_source, NEW.id::text, v_suspect
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

      -- Guests carry no email, so a name match is only ever a flag.
      v_guest_member := NULL;
      v_suspect := public.booking_name_member_suspect(v_guest_first, v_guest_last, v_meeting.unit_id);

      IF v_guest_member IS NOT NULL THEN
        INSERT INTO public.festive_board_attendance (
          meeting_id, member_id, attendance_status, payment_method,
          amount_pence, is_meeting_only, source, source_booking_id
        ) VALUES (
          NEW.meeting_id, v_guest_member, v_status, v_pay,
          v_amount, v_meeting_only, 'booking'::public.attendance_source, v_guest_key
        )
        ON CONFLICT (meeting_id, member_id) WHERE member_id IS NOT NULL
        DO UPDATE SET
          attendance_status = EXCLUDED.attendance_status,
          payment_method    = EXCLUDED.payment_method,
          amount_pence      = EXCLUDED.amount_pence,
          is_meeting_only   = EXCLUDED.is_meeting_only,
          source            = EXCLUDED.source,
          source_booking_id = EXCLUDED.source_booking_id,
          updated_at        = now();
      ELSE
        INSERT INTO public.festive_board_attendance (
          meeting_id, visitor_name, visitor_lodge_name,
          attendance_status, payment_method, amount_pence, is_meeting_only,
          source, source_booking_id, suspected_member_id
        ) VALUES (
          NEW.meeting_id,
          NULLIF(v_guest_name, ''), NULLIF(v_guest_lodge, ''),
          v_status, v_pay, v_amount, v_meeting_only,
          'booking'::public.attendance_source, v_guest_key, v_suspect
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

ALTER TABLE public.bookings ALTER COLUMN unit_id DROP DEFAULT;