
-- ============================================================================
-- visitor_contacts
-- ============================================================================
CREATE TABLE public.visitor_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  lodge_name text,
  lodge_number text,
  opted_out_at timestamptz,
  unsubscribe_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.visitor_contacts TO authenticated;
GRANT ALL ON public.visitor_contacts TO service_role;

ALTER TABLE public.visitor_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view visitor contacts"
  ON public.visitor_contacts FOR SELECT
  TO authenticated
  USING (public.is_active_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins/WM/Secretary can modify visitor contacts"
  ON public.visitor_contacts FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'worshipful_master')
    OR public.has_role(auth.uid(), 'secretary')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'worshipful_master')
    OR public.has_role(auth.uid(), 'secretary')
  );

CREATE TRIGGER tg_visitor_contacts_lower_email
  BEFORE INSERT OR UPDATE OF email ON public.visitor_contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_lowercase_email();

CREATE TRIGGER tg_visitor_contacts_updated_at
  BEFORE UPDATE ON public.visitor_contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================================
-- visitor_attendances (link table)
-- ============================================================================
CREATE TABLE public.visitor_attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_contact_id uuid NOT NULL REFERENCES public.visitor_contacts(id) ON DELETE CASCADE,
  festive_board_attendance_id uuid NOT NULL UNIQUE REFERENCES public.festive_board_attendance(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visitor_attendances_contact ON public.visitor_attendances(visitor_contact_id);

GRANT SELECT ON public.visitor_attendances TO authenticated;
GRANT ALL ON public.visitor_attendances TO service_role;

ALTER TABLE public.visitor_attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view visitor attendances"
  ON public.visitor_attendances FOR SELECT
  TO authenticated
  USING (public.is_active_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins/WM/Secretary can modify visitor attendances"
  ON public.visitor_attendances FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'worshipful_master')
    OR public.has_role(auth.uid(), 'secretary')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'worshipful_master')
    OR public.has_role(auth.uid(), 'secretary')
  );

-- ============================================================================
-- Find-or-create trigger on festive_board_attendance
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_visitor_contact_upsert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_contact_id uuid;
BEGIN
  -- Skip if no email or this row is a registered member (visitor-only logic)
  IF NEW.email IS NULL OR length(trim(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;
  IF NEW.member_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_email := lower(trim(NEW.email));

  -- Upsert by normalised email
  INSERT INTO public.visitor_contacts (email, name, lodge_name, lodge_number, last_seen_at)
  VALUES (
    v_email,
    NULLIF(trim(COALESCE(NEW.visitor_name, '')), ''),
    NULLIF(trim(COALESCE(NEW.visitor_lodge_name, '')), ''),
    NULLIF(trim(COALESCE(NEW.visitor_lodge_number, '')), ''),
    now()
  )
  ON CONFLICT (email) DO UPDATE
    SET
      name = COALESCE(NULLIF(public.visitor_contacts.name, ''), EXCLUDED.name),
      lodge_name = COALESCE(NULLIF(public.visitor_contacts.lodge_name, ''), EXCLUDED.lodge_name),
      lodge_number = COALESCE(NULLIF(public.visitor_contacts.lodge_number, ''), EXCLUDED.lodge_number),
      last_seen_at = now()
  RETURNING id INTO v_contact_id;

  -- Link this attendance to the contact (idempotent on the FK unique)
  INSERT INTO public.visitor_attendances (visitor_contact_id, festive_board_attendance_id)
  VALUES (v_contact_id, NEW.id)
  ON CONFLICT (festive_board_attendance_id) DO UPDATE
    SET visitor_contact_id = EXCLUDED.visitor_contact_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_festive_board_attendance_visitor_contact
  AFTER INSERT OR UPDATE OF email, visitor_name, visitor_lodge_name, visitor_lodge_number
  ON public.festive_board_attendance
  FOR EACH ROW EXECUTE FUNCTION public.tg_visitor_contact_upsert();

-- ============================================================================
-- Backfill existing visitor rows
-- ============================================================================
DO $$
DECLARE
  r record;
  v_email text;
  v_contact_id uuid;
BEGIN
  FOR r IN
    SELECT id, email, visitor_name, visitor_lodge_name, visitor_lodge_number
    FROM public.festive_board_attendance
    WHERE member_id IS NULL
      AND email IS NOT NULL
      AND length(trim(email)) > 0
  LOOP
    v_email := lower(trim(r.email));
    INSERT INTO public.visitor_contacts (email, name, lodge_name, lodge_number, last_seen_at)
    VALUES (
      v_email,
      NULLIF(trim(COALESCE(r.visitor_name, '')), ''),
      NULLIF(trim(COALESCE(r.visitor_lodge_name, '')), ''),
      NULLIF(trim(COALESCE(r.visitor_lodge_number, '')), ''),
      now()
    )
    ON CONFLICT (email) DO UPDATE
      SET
        name = COALESCE(NULLIF(public.visitor_contacts.name, ''), EXCLUDED.name),
        lodge_name = COALESCE(NULLIF(public.visitor_contacts.lodge_name, ''), EXCLUDED.lodge_name),
        lodge_number = COALESCE(NULLIF(public.visitor_contacts.lodge_number, ''), EXCLUDED.lodge_number),
        last_seen_at = GREATEST(public.visitor_contacts.last_seen_at, now())
    RETURNING id INTO v_contact_id;

    INSERT INTO public.visitor_attendances (visitor_contact_id, festive_board_attendance_id)
    VALUES (v_contact_id, r.id)
    ON CONFLICT (festive_board_attendance_id) DO NOTHING;
  END LOOP;
END $$;
