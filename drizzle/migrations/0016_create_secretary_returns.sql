CREATE TYPE public.secretary_return_type AS ENUM ('form_p','lp_a5_certificate','candidate_letter','clearance_letter','change_of_status','installation_return','provincial_return','other');

CREATE TYPE public.secretary_return_status AS ENUM ('draft','submitted','acknowledged');

CREATE OR REPLACE FUNCTION public.can_manage_secretary_returns(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user, 'admin'::public.app_role)
      OR public.has_role(_user, 'secretary'::public.app_role)
      OR public.has_role(_user, 'assistant_secretary'::public.app_role)
      OR public.has_role(_user, 'worshipful_master'::public.app_role)
      OR public.is_current_officer(_user, 'secretary')
      OR public.is_current_officer(_user, 'assistant_secretary')
      OR public.is_current_officer(_user, 'worshipful_master');
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_secretary_returns(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_secretary_returns(uuid) TO authenticated, service_role;

CREATE TABLE public.secretary_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_type public.secretary_return_type NOT NULL,
  member_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  masonic_year integer,
  date_submitted date,
  date_due date,
  status public.secretary_return_status NOT NULL DEFAULT 'draft',
  file_path text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.secretary_returns TO authenticated;
GRANT ALL ON public.secretary_returns TO service_role;

ALTER TABLE public.secretary_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "secretary_returns_select"
ON public.secretary_returns FOR SELECT TO authenticated
USING (public.can_manage_secretary_returns(auth.uid()));

CREATE POLICY "secretary_returns_all"
ON public.secretary_returns FOR ALL TO authenticated
USING (public.can_manage_secretary_returns(auth.uid()))
WITH CHECK (public.can_manage_secretary_returns(auth.uid()));

CREATE INDEX idx_secretary_returns_member ON public.secretary_returns(member_id);
CREATE INDEX idx_secretary_returns_candidate ON public.secretary_returns(candidate_id);

CREATE TRIGGER tg_secretary_returns_updated_at
BEFORE UPDATE ON public.secretary_returns
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();