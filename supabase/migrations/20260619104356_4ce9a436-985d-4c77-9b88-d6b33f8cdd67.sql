
CREATE TABLE public.lodge_development_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  snapshot jsonb NOT NULL,
  mentor_statement text,
  exec_summary text,
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.lodge_development_reports TO authenticated;
GRANT ALL ON public.lodge_development_reports TO service_role;

ALTER TABLE public.lodge_development_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors and managers can view development reports"
  ON public.lodge_development_reports FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role)
    OR public.has_role(auth.uid(), 'secretary'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.member_development_records r
      WHERE r.assigned_mentor_id = auth.uid()
    )
  );

CREATE POLICY "Mentors and managers can create development reports"
  ON public.lodge_development_reports FOR INSERT TO authenticated
  WITH CHECK (
    generated_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role)
      OR public.has_role(auth.uid(), 'secretary'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.member_development_records r
        WHERE r.assigned_mentor_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can delete development reports"
  ON public.lodge_development_reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
