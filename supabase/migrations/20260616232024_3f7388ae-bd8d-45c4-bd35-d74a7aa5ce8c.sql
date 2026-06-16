
-- 1. New profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_ugle_portal_registered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS passing_date date,
  ADD COLUMN IF NOT EXISTS raising_date date,
  ADD COLUMN IF NOT EXISTS joined_lodge_date date;

-- 2. Extend member_status enum
ALTER TYPE public.member_status ADD VALUE IF NOT EXISTS 'year_out';
ALTER TYPE public.member_status ADD VALUE IF NOT EXISTS 'resigned';
ALTER TYPE public.member_status ADD VALUE IF NOT EXISTS 'excluded';
ALTER TYPE public.member_status ADD VALUE IF NOT EXISTS 'deceased';

-- 3. WM terms (supports repeat Masters)
CREATE TABLE IF NOT EXISTS public.member_wm_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year_started integer NOT NULL,
  year_ended integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_wm_terms TO authenticated;
GRANT ALL ON public.member_wm_terms TO service_role;

ALTER TABLE public.member_wm_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view WM terms"
  ON public.member_wm_terms FOR SELECT
  TO authenticated
  USING (public.is_active_member(auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins and secretaries manage WM terms"
  ON public.member_wm_terms FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary'));

CREATE TRIGGER trg_wm_terms_updated
  BEFORE UPDATE ON public.member_wm_terms
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4. Succession risks
CREATE TABLE IF NOT EXISTS public.succession_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text NOT NULL UNIQUE,
  note text,
  flagged_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.succession_risks TO authenticated;
GRANT ALL ON public.succession_risks TO service_role;

ALTER TABLE public.succession_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view succession risks"
  ON public.succession_risks FOR SELECT
  TO authenticated
  USING (public.is_active_member(auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins and secretaries manage succession risks"
  ON public.succession_risks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary'));

CREATE TRIGGER trg_succession_risks_updated
  BEFORE UPDATE ON public.succession_risks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
