CREATE TABLE public.provincial_return_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lodge_year int NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by uuid,
  sent_by_name text,
  recipient_email text NOT NULL,
  storage_path text NOT NULL
);
CREATE INDEX provincial_return_submissions_year_idx ON public.provincial_return_submissions(lodge_year, sent_at DESC);
GRANT SELECT ON public.provincial_return_submissions TO authenticated;
GRANT ALL ON public.provincial_return_submissions TO service_role;
ALTER TABLE public.provincial_return_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Secretary returns managers read provincial submissions" ON public.provincial_return_submissions
  FOR SELECT TO authenticated USING (public.can_manage_secretary_returns(auth.uid()));