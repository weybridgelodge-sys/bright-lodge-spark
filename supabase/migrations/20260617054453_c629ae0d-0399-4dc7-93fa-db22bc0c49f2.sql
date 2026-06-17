CREATE TABLE public.loi_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date date NOT NULL,
  focus text NOT NULL CHECK (focus IN ('first_degree','second_degree','third_degree','installation','general','other')),
  focus_other text,
  kpi_category text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loi_sessions TO authenticated;
GRANT ALL ON public.loi_sessions TO service_role;

ALTER TABLE public.loi_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members can view LOI sessions"
  ON public.loi_sessions FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()));

CREATE POLICY "Managers can insert LOI sessions"
  ON public.loi_sessions FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'secretary'::app_role)
    OR public.has_role(auth.uid(), 'worshipful_master'::app_role)
    OR public.has_role(auth.uid(), 'director_of_ceremonies'::app_role)
  );

CREATE POLICY "Managers can update LOI sessions"
  ON public.loi_sessions FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'secretary'::app_role)
    OR public.has_role(auth.uid(), 'worshipful_master'::app_role)
    OR public.has_role(auth.uid(), 'director_of_ceremonies'::app_role)
  );

CREATE POLICY "Managers can delete LOI sessions"
  ON public.loi_sessions FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'secretary'::app_role)
    OR public.has_role(auth.uid(), 'worshipful_master'::app_role)
    OR public.has_role(auth.uid(), 'director_of_ceremonies'::app_role)
  );

CREATE TRIGGER tg_loi_sessions_updated_at
  BEFORE UPDATE ON public.loi_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.loi_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.loi_sessions(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  part text NOT NULL CHECK (part IN ('candidate','inner_guard','junior_deacon','senior_deacon','junior_warden','senior_warden','worshipful_master','director_of_ceremonies','ipm','chaplain','observing','other')),
  part_other text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, member_id)
);

CREATE UNIQUE INDEX loi_attendance_unique_office
  ON public.loi_attendance (session_id, part)
  WHERE part NOT IN ('observing','other','candidate');

CREATE INDEX loi_attendance_member_idx ON public.loi_attendance (member_id);
CREATE INDEX loi_attendance_session_idx ON public.loi_attendance (session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loi_attendance TO authenticated;
GRANT ALL ON public.loi_attendance TO service_role;

ALTER TABLE public.loi_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members can view LOI attendance"
  ON public.loi_attendance FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()));

CREATE POLICY "Managers can insert LOI attendance"
  ON public.loi_attendance FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'secretary'::app_role)
    OR public.has_role(auth.uid(), 'worshipful_master'::app_role)
    OR public.has_role(auth.uid(), 'director_of_ceremonies'::app_role)
  );

CREATE POLICY "Managers can update LOI attendance"
  ON public.loi_attendance FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'secretary'::app_role)
    OR public.has_role(auth.uid(), 'worshipful_master'::app_role)
    OR public.has_role(auth.uid(), 'director_of_ceremonies'::app_role)
  );

CREATE POLICY "Managers can delete LOI attendance"
  ON public.loi_attendance FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'secretary'::app_role)
    OR public.has_role(auth.uid(), 'worshipful_master'::app_role)
    OR public.has_role(auth.uid(), 'director_of_ceremonies'::app_role)
  );