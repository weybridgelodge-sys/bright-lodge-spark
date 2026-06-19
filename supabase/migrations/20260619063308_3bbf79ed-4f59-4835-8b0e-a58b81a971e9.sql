
-- Profile additions (reuse existing passing_date, raising_date, ugle_reg_number)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS royal_arch_date date,
  ADD COLUMN IF NOT EXISTS proposer text;

-- Per-member development record (1:1 with profile)
CREATE TABLE public.member_development_records (
  member_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_mentor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  previous_masonic_experience text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_development_records TO authenticated;
GRANT ALL ON public.member_development_records TO service_role;
ALTER TABLE public.member_development_records ENABLE ROW LEVEL SECURITY;

-- Security-definer helper (must exist before policies reference it)
CREATE OR REPLACE FUNCTION public.can_edit_member_development(_editor uuid, _member uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_editor, 'admin'::public.app_role)
    OR public.has_role(_editor, 'worshipful_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.member_development_records r
      WHERE r.member_id = _member AND r.assigned_mentor_id = _editor
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_member_ritual(_editor uuid, _member uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.can_edit_member_development(_editor, _member)
    OR public.has_role(_editor, 'director_of_ceremonies'::public.app_role)
    OR public.has_role(_editor, 'secretary'::public.app_role);
$$;

CREATE POLICY "Members read own development record"
  ON public.member_development_records FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR public.can_edit_member_development(auth.uid(), member_id));
CREATE POLICY "Editors insert development record"
  ON public.member_development_records FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role)
    OR member_id = auth.uid()
  );
CREATE POLICY "Editors update development record"
  ON public.member_development_records FOR UPDATE TO authenticated
  USING (public.can_edit_member_development(auth.uid(), member_id))
  WITH CHECK (public.can_edit_member_development(auth.uid(), member_id));
CREATE POLICY "Admins delete development record"
  ON public.member_development_records FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER set_updated_at_mdr BEFORE UPDATE ON public.member_development_records
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Checklist items
CREATE TABLE public.member_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage text NOT NULL,
  topic text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  target_date date,
  completed_date date,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','complete')),
  mentor_notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(member_id, stage, topic)
);
CREATE INDEX ON public.member_checklist_items(member_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_checklist_items TO authenticated;
GRANT ALL ON public.member_checklist_items TO service_role;
ALTER TABLE public.member_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own/assigned checklist"
  ON public.member_checklist_items FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR public.can_edit_member_development(auth.uid(), member_id));
CREATE POLICY "Editors insert checklist"
  ON public.member_checklist_items FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_member_development(auth.uid(), member_id));
CREATE POLICY "Editors update checklist"
  ON public.member_checklist_items FOR UPDATE TO authenticated
  USING (public.can_edit_member_development(auth.uid(), member_id))
  WITH CHECK (public.can_edit_member_development(auth.uid(), member_id));
CREATE POLICY "Editors delete checklist"
  ON public.member_checklist_items FOR DELETE TO authenticated
  USING (public.can_edit_member_development(auth.uid(), member_id));
CREATE TRIGGER set_updated_at_mci BEFORE UPDATE ON public.member_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Ritual record
CREATE TABLE public.member_ritual_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ritual_group text NOT NULL,
  piece text NOT NULL,
  degree text,
  order_index int NOT NULL DEFAULT 0,
  date_first_learned date,
  date_assessed date,
  date_delivered_loi date,
  date_delivered_lodge date,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(member_id, ritual_group, piece)
);
CREATE INDEX ON public.member_ritual_records(member_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_ritual_records TO authenticated;
GRANT ALL ON public.member_ritual_records TO service_role;
ALTER TABLE public.member_ritual_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own/assigned ritual"
  ON public.member_ritual_records FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR public.can_edit_member_ritual(auth.uid(), member_id));
CREATE POLICY "Editors insert ritual"
  ON public.member_ritual_records FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_member_ritual(auth.uid(), member_id));
CREATE POLICY "Editors update ritual"
  ON public.member_ritual_records FOR UPDATE TO authenticated
  USING (public.can_edit_member_ritual(auth.uid(), member_id))
  WITH CHECK (public.can_edit_member_ritual(auth.uid(), member_id));
CREATE POLICY "Editors delete ritual"
  ON public.member_ritual_records FOR DELETE TO authenticated
  USING (public.can_edit_member_ritual(auth.uid(), member_id));
CREATE TRIGGER set_updated_at_mrr BEFORE UPDATE ON public.member_ritual_records
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- External appointments (Province / UGLE / etc.)
CREATE TABLE public.member_external_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  office text NOT NULL,
  masonic_year text,
  date_appointed date,
  date_installed date,
  level text NOT NULL DEFAULT 'province' CHECK (level IN ('lodge','province','ugle','other')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.member_external_appointments(member_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_external_appointments TO authenticated;
GRANT ALL ON public.member_external_appointments TO service_role;
ALTER TABLE public.member_external_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own/assigned external appointments"
  ON public.member_external_appointments FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR public.can_edit_member_development(auth.uid(), member_id));
CREATE POLICY "Editors insert external appointments"
  ON public.member_external_appointments FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_member_development(auth.uid(), member_id));
CREATE POLICY "Editors update external appointments"
  ON public.member_external_appointments FOR UPDATE TO authenticated
  USING (public.can_edit_member_development(auth.uid(), member_id))
  WITH CHECK (public.can_edit_member_development(auth.uid(), member_id));
CREATE POLICY "Editors delete external appointments"
  ON public.member_external_appointments FOR DELETE TO authenticated
  USING (public.can_edit_member_development(auth.uid(), member_id));
CREATE TRIGGER set_updated_at_mea BEFORE UPDATE ON public.member_external_appointments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
