CREATE TABLE public.almoner_widows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 200),
  preferred_address text,
  address text,
  home_type text NOT NULL DEFAULT 'own_home' CHECK (home_type IN ('own_home','care_home')),
  care_home_name text,
  care_home_address text,
  phone text,
  dob_day smallint,
  dob_month smallint,
  dob_year smallint,
  husband_name text,
  husband_lodge text,
  connection_source text NOT NULL DEFAULT 'lodge_member' CHECK (connection_source IN ('lodge_member','smwa')),
  smwa_reference text,
  smwa_liaison text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','deceased')),
  deceased_on date,
  contact_interval_days integer NOT NULL DEFAULT 90 CHECK (contact_interval_days BETWEEN 7 AND 730),
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.almoner_widows TO authenticated;
GRANT ALL ON public.almoner_widows TO service_role;
ALTER TABLE public.almoner_widows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Almoner viewers read widows" ON public.almoner_widows FOR SELECT TO authenticated USING (public.can_view_almoner(auth.uid()));
CREATE POLICY "Almoner editors add widows" ON public.almoner_widows FOR INSERT TO authenticated WITH CHECK (public.can_edit_almoner(auth.uid()));
CREATE POLICY "Almoner editors update widows" ON public.almoner_widows FOR UPDATE TO authenticated USING (public.can_edit_almoner(auth.uid())) WITH CHECK (public.can_edit_almoner(auth.uid()));

CREATE TABLE public.almoner_widow_kin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widow_id uuid NOT NULL REFERENCES public.almoner_widows(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  relationship text NOT NULL DEFAULT 'other' CHECK (relationship IN ('son','daughter','neighbour','friend','other')),
  relationship_other text,
  phone text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.almoner_widow_kin(widow_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.almoner_widow_kin TO authenticated;
GRANT ALL ON public.almoner_widow_kin TO service_role;
ALTER TABLE public.almoner_widow_kin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Almoner viewers read kin" ON public.almoner_widow_kin FOR SELECT TO authenticated USING (public.can_view_almoner(auth.uid()));
CREATE POLICY "Almoner editors add kin" ON public.almoner_widow_kin FOR INSERT TO authenticated WITH CHECK (public.can_edit_almoner(auth.uid()));
CREATE POLICY "Almoner editors update kin" ON public.almoner_widow_kin FOR UPDATE TO authenticated USING (public.can_edit_almoner(auth.uid())) WITH CHECK (public.can_edit_almoner(auth.uid()));
CREATE POLICY "Almoner editors delete kin" ON public.almoner_widow_kin FOR DELETE TO authenticated USING (public.can_edit_almoner(auth.uid()));

CREATE TABLE public.almoner_widow_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widow_id uuid NOT NULL REFERENCES public.almoner_widows(id) ON DELETE CASCADE,
  contact_date date NOT NULL DEFAULT CURRENT_DATE,
  contact_type text NOT NULL CHECK (contact_type IN ('phone','visit','card','letter','gift','other')),
  notes text,
  welfare_concern boolean NOT NULL DEFAULT false,
  logged_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.almoner_widow_contacts(widow_id, contact_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.almoner_widow_contacts TO authenticated;
GRANT ALL ON public.almoner_widow_contacts TO service_role;
ALTER TABLE public.almoner_widow_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Almoner viewers read widow contacts" ON public.almoner_widow_contacts FOR SELECT TO authenticated USING (public.can_view_almoner(auth.uid()));
CREATE POLICY "Almoner editors add widow contacts" ON public.almoner_widow_contacts FOR INSERT TO authenticated WITH CHECK (public.can_edit_almoner(auth.uid()));
CREATE POLICY "Almoner editors update widow contacts" ON public.almoner_widow_contacts FOR UPDATE TO authenticated USING (public.can_edit_almoner(auth.uid())) WITH CHECK (public.can_edit_almoner(auth.uid()));
CREATE POLICY "Almoner editors delete widow contacts" ON public.almoner_widow_contacts FOR DELETE TO authenticated USING (public.can_edit_almoner(auth.uid()));

CREATE OR REPLACE FUNCTION public.almoner_widows_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.dob_day IS NULL AND NEW.dob_month IS NULL THEN
    IF NEW.dob_year IS NOT NULL THEN RAISE EXCEPTION 'Birth year needs a day and month'; END IF;
  ELSE
    IF NEW.dob_day IS NULL OR NEW.dob_month IS NULL THEN RAISE EXCEPTION 'Date of birth needs both day and month'; END IF;
    IF NEW.dob_month NOT BETWEEN 1 AND 12 OR NEW.dob_day NOT BETWEEN 1 AND 31 THEN RAISE EXCEPTION 'Date of birth is not a real date'; END IF;
    BEGIN
      IF NEW.dob_year IS NOT NULL THEN
        IF NEW.dob_year < 1900 OR NEW.dob_year > EXTRACT(YEAR FROM CURRENT_DATE) THEN RAISE EXCEPTION 'Birth year out of range'; END IF;
        PERFORM make_date(NEW.dob_year, NEW.dob_month, NEW.dob_day);
      ELSE
        PERFORM make_date(2000, NEW.dob_month, NEW.dob_day);
      END IF;
    EXCEPTION WHEN datetime_field_overflow THEN
      RAISE EXCEPTION 'Date of birth is not a real date';
    END;
  END IF;
  IF NEW.status = 'active' THEN NEW.deceased_on := NULL;
  ELSIF NEW.deceased_on IS NULL THEN NEW.deceased_on := CURRENT_DATE; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER almoner_widows_validate BEFORE INSERT OR UPDATE ON public.almoner_widows
  FOR EACH ROW EXECUTE FUNCTION public.almoner_widows_validate();

CREATE OR REPLACE FUNCTION public.almoner_widow_child_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER almoner_widow_kin_touch BEFORE UPDATE ON public.almoner_widow_kin FOR EACH ROW EXECUTE FUNCTION public.almoner_widow_child_touch();
CREATE TRIGGER almoner_widow_contacts_touch BEFORE UPDATE ON public.almoner_widow_contacts FOR EACH ROW EXECUTE FUNCTION public.almoner_widow_child_touch();