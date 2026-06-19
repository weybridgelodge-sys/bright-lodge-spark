
-- 1. Member development record extensions
ALTER TABLE public.member_development_records
  ADD COLUMN IF NOT EXISTS mentoring_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exemption_reason text,
  ADD COLUMN IF NOT EXISTS exemption_note text,
  ADD COLUMN IF NOT EXISTS last_checkin_date date;

-- 2. Preceptor's notes (private to Admin/WM/DC)
CREATE TABLE IF NOT EXISTS public.member_preceptor_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ritual_group text NOT NULL,
  piece text NOT NULL,
  notes text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, ritual_group, piece)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_preceptor_notes TO authenticated;
GRANT ALL ON public.member_preceptor_notes TO service_role;
ALTER TABLE public.member_preceptor_notes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_skills_matrix(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user, 'admin'::public.app_role)
      OR public.has_role(_user, 'worshipful_master'::public.app_role)
      OR public.has_role(_user, 'director_of_ceremonies'::public.app_role);
$$;

CREATE POLICY "DC/WM/Admin read preceptor notes" ON public.member_preceptor_notes
  FOR SELECT TO authenticated USING (public.can_view_skills_matrix(auth.uid()));
CREATE POLICY "DC/WM/Admin upsert preceptor notes" ON public.member_preceptor_notes
  FOR INSERT TO authenticated WITH CHECK (public.can_view_skills_matrix(auth.uid()));
CREATE POLICY "DC/WM/Admin update preceptor notes" ON public.member_preceptor_notes
  FOR UPDATE TO authenticated USING (public.can_view_skills_matrix(auth.uid())) WITH CHECK (public.can_view_skills_matrix(auth.uid()));
CREATE POLICY "DC/WM/Admin delete preceptor notes" ON public.member_preceptor_notes
  FOR DELETE TO authenticated USING (public.can_view_skills_matrix(auth.uid()));

CREATE TRIGGER set_updated_at_mpn BEFORE UPDATE ON public.member_preceptor_notes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. Module settings (singleton)
CREATE TABLE IF NOT EXISTS public.module_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.module_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.module_settings TO authenticated;
GRANT ALL ON public.module_settings TO service_role;
ALTER TABLE public.module_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members read settings" ON public.module_settings
  FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Secretary/Admin upsert settings" ON public.module_settings
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'secretary'::public.app_role)
  );
CREATE POLICY "Secretary/Admin update settings" ON public.module_settings
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'secretary'::public.app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'secretary'::public.app_role)
  );

INSERT INTO public.module_settings (key, value)
VALUES ('mentoring_threshold_date', '"2025-10-01"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. LoI part assignments
CREATE TABLE IF NOT EXISTS public.loi_part_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loi_session_id uuid NOT NULL REFERENCES public.loi_sessions(id) ON DELETE CASCADE,
  ritual_group text NOT NULL,
  piece text NOT NULL,
  member_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loi_session_id, ritual_group, piece)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loi_part_assignments TO authenticated;
GRANT ALL ON public.loi_part_assignments TO service_role;
ALTER TABLE public.loi_part_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members view assignments" ON public.loi_part_assignments
  FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Managers insert assignments" ON public.loi_part_assignments
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'worshipful_master'::public.app_role)
    OR public.has_role(auth.uid(),'director_of_ceremonies'::public.app_role)
    OR public.has_role(auth.uid(),'secretary'::public.app_role)
  );
CREATE POLICY "Managers update assignments" ON public.loi_part_assignments
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'worshipful_master'::public.app_role)
    OR public.has_role(auth.uid(),'director_of_ceremonies'::public.app_role)
    OR public.has_role(auth.uid(),'secretary'::public.app_role)
  ) WITH CHECK (true);
CREATE POLICY "Managers delete assignments" ON public.loi_part_assignments
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'worshipful_master'::public.app_role)
    OR public.has_role(auth.uid(),'director_of_ceremonies'::public.app_role)
    OR public.has_role(auth.uid(),'secretary'::public.app_role)
  );

CREATE TRIGGER set_updated_at_lpa BEFORE UPDATE ON public.loi_part_assignments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 5. Lodge skills matrix RPC
CREATE OR REPLACE FUNCTION public.lodge_skills_matrix()
RETURNS TABLE (
  member_id uuid,
  full_name text,
  first_name text,
  last_name text,
  preferred_name text,
  degree text,
  ritual_group text,
  piece text,
  level text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id AS member_id,
    p.full_name, p.first_name, p.last_name, p.preferred_name,
    p.degree::text,
    r.ritual_group,
    r.piece,
    CASE
      WHEN r.date_delivered_lodge IS NOT NULL THEN 'lodge'
      WHEN r.date_delivered_loi   IS NOT NULL THEN 'loi'
      WHEN r.date_assessed        IS NOT NULL THEN 'assessed'
      WHEN r.date_first_learned   IS NOT NULL THEN 'learned'
      ELSE NULL
    END AS level
  FROM public.profiles p
  JOIN public.member_ritual_records r ON r.member_id = p.id
  WHERE p.status = 'active'
    AND public.can_view_skills_matrix(auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.lodge_skills_matrix() TO authenticated;
