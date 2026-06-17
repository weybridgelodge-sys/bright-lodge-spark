
CREATE TYPE public.candidate_stage AS ENUM ('enquiry','face_to_face','form_p','interviewed','read_in_lodge','initiated','withdrawn');

CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  proposer TEXT,
  seconder TEXT,
  stage public.candidate_stage NOT NULL DEFAULT 'enquiry',
  notes TEXT,
  date_of_enquiry DATE DEFAULT CURRENT_DATE,
  converted_member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Progression managers can view candidates"
ON public.candidates FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'secretary')
  OR public.has_role(auth.uid(),'worshipful_master')
);

CREATE POLICY "Progression managers can insert candidates"
ON public.candidates FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'secretary')
  OR public.has_role(auth.uid(),'worshipful_master')
);

CREATE POLICY "Progression managers can update candidates"
ON public.candidates FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'secretary')
  OR public.has_role(auth.uid(),'worshipful_master')
);

CREATE POLICY "Admins can delete candidates"
ON public.candidates FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER candidates_set_updated_at
BEFORE UPDATE ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
