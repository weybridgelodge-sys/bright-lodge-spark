-- JOB CP Migration 1: lodge column + fill rules on officer_appointments, visitor_contacts, event_bookings.
-- ROLLBACK: DROP TRIGGER officer_appointments_fill_unit ON public.officer_appointments;
--           DROP TRIGGER visitor_contacts_fill_unit ON public.visitor_contacts;
--           DROP TRIGGER event_bookings_fill_unit ON public.event_bookings; DROP FUNCTION public.event_booking_fill_unit();
--           and re-create tg_visitor_contact_upsert from the ORIGINAL body below. Columns may stay (unused).
-- ORIGINAL tg_visitor_contact_upsert (verbatim):
-- CREATE OR REPLACE FUNCTION public.tg_visitor_contact_upsert()
--  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_email text; v_name text; v_lodge text; v_number text; v_contact_id uuid; v_seen timestamptz;
--   v_overwrite boolean := (TG_OP = 'UPDATE');
-- BEGIN
--   IF NEW.member_id IS NOT NULL OR NEW.suspected_member_id IS NOT NULL THEN RETURN NEW; END IF;
--   v_email  := NULLIF(lower(trim(COALESCE(NEW.email, ''))), '');
--   v_name   := NULLIF(trim(COALESCE(NEW.visitor_name, '')), '');
--   v_lodge  := NULLIF(trim(COALESCE(NEW.visitor_lodge_name, '')), '');
--   v_number := NULLIF(trim(COALESCE(NEW.visitor_lodge_number, '')), '');
--   IF v_email IS NULL AND v_name IS NULL THEN RETURN NEW; END IF;
--   SELECT m.meeting_date::timestamptz INTO v_seen FROM public.festive_board_meetings m WHERE m.id = NEW.meeting_id;
--   v_seen := COALESCE(v_seen, now());
--   IF v_email IS NOT NULL THEN
--     INSERT INTO public.visitor_contacts (email, name, lodge_name, lodge_number, last_seen_at)
--     VALUES (v_email, v_name, v_lodge, v_number, v_seen)
--     ON CONFLICT (email) DO UPDATE SET
--       name = CASE WHEN v_overwrite THEN COALESCE(EXCLUDED.name, public.visitor_contacts.name) ELSE COALESCE(NULLIF(public.visitor_contacts.name, ''), EXCLUDED.name) END,
--       lodge_name = CASE WHEN v_overwrite THEN COALESCE(EXCLUDED.lodge_name, public.visitor_contacts.lodge_name) ELSE COALESCE(NULLIF(public.visitor_contacts.lodge_name, ''), EXCLUDED.lodge_name) END,
--       lodge_number = CASE WHEN v_overwrite THEN COALESCE(EXCLUDED.lodge_number, public.visitor_contacts.lodge_number) ELSE COALESCE(NULLIF(public.visitor_contacts.lodge_number, ''), EXCLUDED.lodge_number) END,
--       last_seen_at = GREATEST(COALESCE(public.visitor_contacts.last_seen_at, EXCLUDED.last_seen_at), EXCLUDED.last_seen_at)
--     RETURNING id INTO v_contact_id;
--   ELSE
--     SELECT c.id INTO v_contact_id FROM public.visitor_contacts c
--     WHERE c.email IS NULL AND lower(trim(c.name)) = lower(v_name)
--       AND COALESCE(lower(trim(c.lodge_name)), '') = COALESCE(lower(v_lodge), '')
--     ORDER BY c.created_at LIMIT 1;
--     IF v_contact_id IS NULL AND v_overwrite THEN
--       SELECT c.id INTO v_contact_id FROM public.visitor_contacts c
--       WHERE c.email IS NULL AND lower(trim(c.name)) = lower(v_name) ORDER BY c.created_at LIMIT 1;
--     END IF;
--     IF v_contact_id IS NULL THEN
--       INSERT INTO public.visitor_contacts (email, name, lodge_name, lodge_number, last_seen_at)
--       VALUES (NULL, v_name, v_lodge, v_number, v_seen) RETURNING id INTO v_contact_id;
--     ELSE
--       UPDATE public.visitor_contacts
--       SET name = CASE WHEN v_overwrite THEN COALESCE(v_name, name) ELSE COALESCE(NULLIF(name, ''), v_name) END,
--           lodge_name = CASE WHEN v_overwrite THEN COALESCE(v_lodge, lodge_name) ELSE COALESCE(NULLIF(lodge_name, ''), v_lodge) END,
--           lodge_number = CASE WHEN v_overwrite THEN COALESCE(v_number, lodge_number) ELSE COALESCE(NULLIF(lodge_number, ''), v_number) END,
--           last_seen_at = GREATEST(COALESCE(last_seen_at, v_seen), v_seen)
--       WHERE id = v_contact_id;
--     END IF;
--   END IF;
--   INSERT INTO public.visitor_attendances (visitor_contact_id, festive_board_attendance_id)
--   VALUES (v_contact_id, NEW.id)
--   ON CONFLICT (festive_board_attendance_id) DO UPDATE SET visitor_contact_id = EXCLUDED.visitor_contact_id;
--   RETURN NEW;
-- END;
-- $function$

DO $$ BEGIN
  IF (SELECT count(*) FROM public.units) <> 1 THEN RAISE EXCEPTION 'JOB CP: expected exactly one unit'; END IF;
END $$;

ALTER TABLE public.officer_appointments ADD COLUMN IF NOT EXISTS unit_id text REFERENCES public.units(id);
ALTER TABLE public.visitor_contacts     ADD COLUMN IF NOT EXISTS unit_id text REFERENCES public.units(id);
ALTER TABLE public.event_bookings       ADD COLUMN IF NOT EXISTS unit_id text REFERENCES public.units(id);

UPDATE public.officer_appointments SET unit_id = (SELECT id FROM public.units) WHERE unit_id IS NULL;
UPDATE public.visitor_contacts     SET unit_id = (SELECT id FROM public.units) WHERE unit_id IS NULL;
UPDATE public.event_bookings b SET unit_id = coalesce(nullif(btrim(e.unit_id),''), (SELECT id FROM public.units))
  FROM public.event_accounts e WHERE e.id = b.event_id AND b.unit_id IS NULL;

CREATE INDEX IF NOT EXISTS officer_appointments_unit_idx ON public.officer_appointments(unit_id);
CREATE INDEX IF NOT EXISTS visitor_contacts_unit_idx     ON public.visitor_contacts(unit_id);
CREATE INDEX IF NOT EXISTS event_bookings_unit_idx       ON public.event_bookings(unit_id);

DROP TRIGGER IF EXISTS officer_appointments_fill_unit ON public.officer_appointments;
CREATE TRIGGER officer_appointments_fill_unit BEFORE INSERT ON public.officer_appointments
  FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();
DROP TRIGGER IF EXISTS visitor_contacts_fill_unit ON public.visitor_contacts;
CREATE TRIGGER visitor_contacts_fill_unit BEFORE INSERT ON public.visitor_contacts
  FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();

CREATE OR REPLACE FUNCTION public.event_booking_fill_unit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.unit_id := coalesce(
    (SELECT nullif(btrim(e.unit_id),'') FROM public.event_accounts e WHERE e.id = NEW.event_id),
    (SELECT nullif(btrim(p.unit_id),'') FROM public.profiles p WHERE p.id = auth.uid()));
  IF NEW.unit_id IS NULL THEN
    RAISE EXCEPTION 'This event has no lodge set, so the booking cannot be saved. Ask the Treasurer to set the event''s lodge.'
      USING ERRCODE = 'P0001', HINT = 'no_unit_for_write';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS event_bookings_fill_unit ON public.event_bookings;
CREATE TRIGGER event_bookings_fill_unit BEFORE INSERT OR UPDATE OF event_id, unit_id ON public.event_bookings
  FOR EACH ROW EXECUTE FUNCTION public.event_booking_fill_unit();

CREATE OR REPLACE FUNCTION public.tg_visitor_contact_upsert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_email text; v_name text; v_lodge text; v_number text; v_contact_id uuid; v_seen timestamptz;
  v_unit text; v_overwrite boolean := (TG_OP = 'UPDATE');
BEGIN
  IF NEW.member_id IS NOT NULL OR NEW.suspected_member_id IS NOT NULL THEN RETURN NEW; END IF;
  v_email := NULLIF(lower(trim(COALESCE(NEW.email, ''))), '');
  v_name := NULLIF(trim(COALESCE(NEW.visitor_name, '')), '');
  v_lodge := NULLIF(trim(COALESCE(NEW.visitor_lodge_name, '')), '');
  v_number := NULLIF(trim(COALESCE(NEW.visitor_lodge_number, '')), '');
  IF v_email IS NULL AND v_name IS NULL THEN RETURN NEW; END IF;
  SELECT m.meeting_date::timestamptz, NULLIF(btrim(m.unit_id), '') INTO v_seen, v_unit
    FROM public.festive_board_meetings m WHERE m.id = NEW.meeting_id;
  IF v_unit IS NULL THEN RETURN NEW; END IF;
  v_seen := COALESCE(v_seen, now());
  IF v_email IS NOT NULL THEN
    INSERT INTO public.visitor_contacts (email, name, lodge_name, lodge_number, last_seen_at, unit_id)
    VALUES (v_email, v_name, v_lodge, v_number, v_seen, v_unit)
    ON CONFLICT (email) DO UPDATE SET
      name = CASE WHEN v_overwrite THEN COALESCE(EXCLUDED.name, public.visitor_contacts.name) ELSE COALESCE(NULLIF(public.visitor_contacts.name, ''), EXCLUDED.name) END,
      lodge_name = CASE WHEN v_overwrite THEN COALESCE(EXCLUDED.lodge_name, public.visitor_contacts.lodge_name) ELSE COALESCE(NULLIF(public.visitor_contacts.lodge_name, ''), EXCLUDED.lodge_name) END,
      lodge_number = CASE WHEN v_overwrite THEN COALESCE(EXCLUDED.lodge_number, public.visitor_contacts.lodge_number) ELSE COALESCE(NULLIF(public.visitor_contacts.lodge_number, ''), EXCLUDED.lodge_number) END,
      last_seen_at = GREATEST(COALESCE(public.visitor_contacts.last_seen_at, EXCLUDED.last_seen_at), EXCLUDED.last_seen_at)
    RETURNING id INTO v_contact_id;
  ELSE
    SELECT c.id INTO v_contact_id FROM public.visitor_contacts c
     WHERE c.email IS NULL AND c.unit_id = v_unit AND lower(trim(c.name)) = lower(v_name)
       AND COALESCE(lower(trim(c.lodge_name)), '') = COALESCE(lower(v_lodge), '')
     ORDER BY c.created_at LIMIT 1;
    IF v_contact_id IS NULL AND v_overwrite THEN
      SELECT c.id INTO v_contact_id FROM public.visitor_contacts c
       WHERE c.email IS NULL AND c.unit_id = v_unit AND lower(trim(c.name)) = lower(v_name)
       ORDER BY c.created_at LIMIT 1;
    END IF;
    IF v_contact_id IS NULL THEN
      INSERT INTO public.visitor_contacts (email, name, lodge_name, lodge_number, last_seen_at, unit_id)
      VALUES (NULL, v_name, v_lodge, v_number, v_seen, v_unit) RETURNING id INTO v_contact_id;
    ELSE
      UPDATE public.visitor_contacts SET
        name = CASE WHEN v_overwrite THEN COALESCE(v_name, name) ELSE COALESCE(NULLIF(name, ''), v_name) END,
        lodge_name = CASE WHEN v_overwrite THEN COALESCE(v_lodge, lodge_name) ELSE COALESCE(NULLIF(lodge_name, ''), v_lodge) END,
        lodge_number = CASE WHEN v_overwrite THEN COALESCE(v_number, lodge_number) ELSE COALESCE(NULLIF(lodge_number, ''), v_number) END,
        last_seen_at = GREATEST(COALESCE(last_seen_at, v_seen), v_seen)
      WHERE id = v_contact_id;
    END IF;
  END IF;
  INSERT INTO public.visitor_attendances (visitor_contact_id, festive_board_attendance_id)
  VALUES (v_contact_id, NEW.id)
  ON CONFLICT (festive_board_attendance_id) DO UPDATE SET visitor_contact_id = EXCLUDED.visitor_contact_id;
  RETURN NEW;
END; $function$;