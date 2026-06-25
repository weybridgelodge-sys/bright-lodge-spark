
CREATE TABLE public.membership_enquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'join-us',
  ip_address text,
  user_agent text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.membership_enquiries TO authenticated;
GRANT ALL ON public.membership_enquiries TO service_role;

ALTER TABLE public.membership_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and secretary can view enquiries"
ON public.membership_enquiries FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'secretary'::public.app_role)
  OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role)
);

CREATE POLICY "Admins and secretary can update enquiries"
ON public.membership_enquiries FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'secretary'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'secretary'::public.app_role)
);

CREATE TRIGGER membership_enquiries_set_updated_at
BEFORE UPDATE ON public.membership_enquiries
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX membership_enquiries_created_at_idx
ON public.membership_enquiries (created_at DESC);
