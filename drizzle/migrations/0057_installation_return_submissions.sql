CREATE TABLE public.installation_return_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lodge_year integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by uuid NOT NULL,
  sent_by_name text,
  recipient_email text NOT NULL,
  storage_path text NOT NULL,
  secretary_changed text CHECK (secretary_changed IN ('Y','N')),
  note text
);
GRANT SELECT ON public.installation_return_submissions TO authenticated;
GRANT ALL ON public.installation_return_submissions TO service_role;
ALTER TABLE public.installation_return_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Secretary returns managers read submissions"
ON public.installation_return_submissions FOR SELECT TO authenticated
USING (public.can_manage_secretary_returns(auth.uid()));
CREATE INDEX ON public.installation_return_submissions (lodge_year, sent_at DESC);