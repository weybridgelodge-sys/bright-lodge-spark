-- 1) Extend app_role enum (idempotent)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'almoner';

-- 2) Welfare enums
DO $$ BEGIN
  CREATE TYPE public.welfare_status_level AS ENUM ('green','amber','red');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.welfare_contact_type AS ENUM (
    'in_person','phone','card','email','lodge_visit','none'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.welfare_contact_nature AS ENUM (
    'routine','illness','bereavement','financial','mental_health','hospitalisation','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Helpers
CREATE OR REPLACE FUNCTION public.current_lodge_year()
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN EXTRACT(MONTH FROM now())::int >= 10 THEN EXTRACT(YEAR FROM now())::int
    ELSE EXTRACT(YEAR FROM now())::int - 1
  END
$$;

CREATE OR REPLACE FUNCTION public.is_current_wm_or_ipm(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.officer_appointments oa
    WHERE oa.member_id = _user_id
      AND oa.lodge_year = public.current_lodge_year()
      AND oa.position_key IN ('worshipful_master','immediate_past_master')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_almoner(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.has_role(_user_id, 'admin'::public.app_role)
      OR public.has_role(_user_id, 'almoner'::public.app_role)
      OR public.is_current_wm_or_ipm(_user_id);
END $$;

-- 4) Welfare member status (one row per member)
CREATE TABLE IF NOT EXISTS public.welfare_member_status (
  member_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.welfare_status_level NOT NULL DEFAULT 'green',
  notes text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.welfare_member_status TO authenticated;
GRANT ALL ON public.welfare_member_status TO service_role;
ALTER TABLE public.welfare_member_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Almoner can read welfare status"
  ON public.welfare_member_status FOR SELECT TO authenticated
  USING (public.can_access_almoner(auth.uid()));
CREATE POLICY "Almoner can insert welfare status"
  ON public.welfare_member_status FOR INSERT TO authenticated
  WITH CHECK (public.can_access_almoner(auth.uid()));
CREATE POLICY "Almoner can update welfare status"
  ON public.welfare_member_status FOR UPDATE TO authenticated
  USING (public.can_access_almoner(auth.uid()))
  WITH CHECK (public.can_access_almoner(auth.uid()));
CREATE POLICY "Almoner can delete welfare status"
  ON public.welfare_member_status FOR DELETE TO authenticated
  USING (public.can_access_almoner(auth.uid()));

CREATE TRIGGER welfare_member_status_updated
  BEFORE UPDATE ON public.welfare_member_status
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 5) Welfare log entries
CREATE TABLE IF NOT EXISTS public.welfare_log_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_date date NOT NULL DEFAULT (now()::date),
  contact_type public.welfare_contact_type NOT NULL,
  contact_nature public.welfare_contact_nature NOT NULL,
  nature_detail text,
  notes text,
  action_taken text,
  follow_up_date date,
  logged_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS welfare_log_member_idx
  ON public.welfare_log_entries (member_id, contact_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.welfare_log_entries TO authenticated;
GRANT ALL ON public.welfare_log_entries TO service_role;
ALTER TABLE public.welfare_log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Almoner can read welfare log"
  ON public.welfare_log_entries FOR SELECT TO authenticated
  USING (public.can_access_almoner(auth.uid()));
CREATE POLICY "Almoner can insert welfare log"
  ON public.welfare_log_entries FOR INSERT TO authenticated
  WITH CHECK (public.can_access_almoner(auth.uid()) AND logged_by = auth.uid());
CREATE POLICY "Almoner can update welfare log"
  ON public.welfare_log_entries FOR UPDATE TO authenticated
  USING (public.can_access_almoner(auth.uid()))
  WITH CHECK (public.can_access_almoner(auth.uid()));
CREATE POLICY "Almoner can delete welfare log"
  ON public.welfare_log_entries FOR DELETE TO authenticated
  USING (public.can_access_almoner(auth.uid()));

CREATE TRIGGER welfare_log_entries_updated
  BEFORE UPDATE ON public.welfare_log_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();