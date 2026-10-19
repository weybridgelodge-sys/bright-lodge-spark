ALTER TABLE public.festive_board_attendance
  ADD COLUMN IF NOT EXISTS suspected_member_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.festive_board_attendance.suspected_member_id IS
  'Booking name matched this active member but the email did not; Secretary to check. Never auto-linked.';

CREATE OR REPLACE FUNCTION public.booking_name_member_suspect(_first text, _last text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT CASE WHEN count(*) = 1 THEN (array_agg(id))[1] END
  FROM public.profiles
  WHERE status = 'active'
    AND coalesce(trim(_first), '') <> '' AND coalesce(trim(_last), '') <> ''
    AND lower(trim(last_name)) = lower(trim(_last))
    AND (lower(trim(first_name)) = lower(trim(_first))
         OR lower(trim(coalesce(preferred_name, ''))) = lower(trim(_first)));
$f$;
REVOKE ALL ON FUNCTION public.booking_name_member_suspect(text, text) FROM PUBLIC, anon, authenticated;

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
      WHERE lower(trim(email)) = v_email AND status = 'active' LIMIT 1;
    END IF;
    IF v_member_id IS NULL THEN
      v_suspect := public.booking_name_member_suspect(v_first, v_last);
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
      v_suspect := public.booking_name_member_suspect(v_guest_first, v_guest_last);

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
  v_overwrite boolean := (TG_OP = 'UPDATE');
BEGIN
  IF NEW.member_id IS NOT NULL OR NEW.suspected_member_id IS NOT NULL THEN
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
        name = CASE WHEN v_overwrite THEN COALESCE(EXCLUDED.name, public.visitor_contacts.name)
                    ELSE COALESCE(NULLIF(public.visitor_contacts.name, ''), EXCLUDED.name) END,
        lodge_name = CASE WHEN v_overwrite THEN COALESCE(EXCLUDED.lodge_name, public.visitor_contacts.lodge_name)
                    ELSE COALESCE(NULLIF(public.visitor_contacts.lodge_name, ''), EXCLUDED.lodge_name) END,
        lodge_number = CASE WHEN v_overwrite THEN COALESCE(EXCLUDED.lodge_number, public.visitor_contacts.lodge_number)
                    ELSE COALESCE(NULLIF(public.visitor_contacts.lodge_number, ''), EXCLUDED.lodge_number) END,
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

    IF v_contact_id IS NULL AND v_overwrite THEN
      SELECT c.id INTO v_contact_id
      FROM public.visitor_contacts c
      WHERE c.email IS NULL
        AND lower(trim(c.name)) = lower(v_name)
      ORDER BY c.created_at
      LIMIT 1;
    END IF;

    IF v_contact_id IS NULL THEN
      INSERT INTO public.visitor_contacts (email, name, lodge_name, lodge_number, last_seen_at)
      VALUES (NULL, v_name, v_lodge, v_number, v_seen)
      RETURNING id INTO v_contact_id;
    ELSE
      UPDATE public.visitor_contacts
      SET name         = CASE WHEN v_overwrite THEN COALESCE(v_name, name)
                              ELSE COALESCE(NULLIF(name, ''), v_name) END,
          lodge_name   = CASE WHEN v_overwrite THEN COALESCE(v_lodge, lodge_name)
                              ELSE COALESCE(NULLIF(lodge_name, ''), v_lodge) END,
          lodge_number = CASE WHEN v_overwrite THEN COALESCE(v_number, lodge_number)
                              ELSE COALESCE(NULLIF(lodge_number, ''), v_number) END,
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