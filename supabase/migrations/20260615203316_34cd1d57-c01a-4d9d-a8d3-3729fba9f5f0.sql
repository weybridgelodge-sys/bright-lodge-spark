
-- Profiles: initiation_date
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initiation_date date;

-- Readiness enum
DO $$ BEGIN
  CREATE TYPE public.progression_readiness AS ENUM ('ready','needs_experience','non_progressive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Officer positions
CREATE TABLE IF NOT EXISTS public.officer_positions (
  key text PRIMARY KEY,
  label text NOT NULL,
  order_index int NOT NULL UNIQUE
);
GRANT SELECT ON public.officer_positions TO authenticated;
GRANT ALL ON public.officer_positions TO service_role;
ALTER TABLE public.officer_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tracker roles can read positions" ON public.officer_positions
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
  );

INSERT INTO public.officer_positions (key,label,order_index) VALUES
  ('inner_guard','Inner Guard',1),
  ('junior_deacon','Junior Deacon',2),
  ('senior_deacon','Senior Deacon',3),
  ('junior_warden','Junior Warden',4),
  ('senior_warden','Senior Warden',5),
  ('worshipful_master','Worshipful Master',6)
ON CONFLICT (key) DO NOTHING;

-- Officer appointments
CREATE TABLE IF NOT EXISTS public.officer_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_key text NOT NULL REFERENCES public.officer_positions(key),
  member_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  lodge_year int NOT NULL,
  appointed_on date,
  is_projection boolean NOT NULL DEFAULT false,
  override_reason text,
  override_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (position_key, lodge_year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.officer_appointments TO authenticated;
GRANT ALL ON public.officer_appointments TO service_role;
ALTER TABLE public.officer_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tracker roles read appointments" ON public.officer_appointments
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
  );
CREATE POLICY "Tracker roles insert appointments" ON public.officer_appointments
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
  );
CREATE POLICY "Tracker roles update appointments" ON public.officer_appointments
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
  ) WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
  );
CREATE POLICY "Tracker roles delete appointments" ON public.officer_appointments
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
  );

CREATE TRIGGER officer_appointments_set_updated_at
  BEFORE UPDATE ON public.officer_appointments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Member progression status
CREATE TABLE IF NOT EXISTS public.member_progression_status (
  member_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  readiness public.progression_readiness NOT NULL DEFAULT 'needs_experience',
  seniority_initiation_date date,
  seniority_tiebreaker int,
  notes text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_progression_status TO authenticated;
GRANT ALL ON public.member_progression_status TO service_role;
ALTER TABLE public.member_progression_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tracker roles read status" ON public.member_progression_status
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
  );
CREATE POLICY "Tracker roles insert status" ON public.member_progression_status
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
  );
CREATE POLICY "Tracker roles update status" ON public.member_progression_status
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
  ) WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
  );
CREATE POLICY "Tracker roles delete status" ON public.member_progression_status
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
  );

CREATE TRIGGER member_progression_status_set_updated_at
  BEFORE UPDATE ON public.member_progression_status
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Effective initiation date helper
CREATE OR REPLACE FUNCTION public.effective_initiation_date(_member_id uuid)
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT seniority_initiation_date FROM public.member_progression_status WHERE member_id = _member_id),
    (SELECT initiation_date FROM public.profiles WHERE id = _member_id)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.effective_initiation_date(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.effective_initiation_date(uuid) TO authenticated, service_role;
