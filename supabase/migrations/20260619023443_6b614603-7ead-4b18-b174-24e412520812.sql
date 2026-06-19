
CREATE TYPE public.almoner_report_status AS ENUM ('draft','final');

CREATE TABLE public.almoner_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Almoner''s Report',
  period_from date NOT NULL,
  period_to date NOT NULL,
  advice text NOT NULL DEFAULT '',
  markdown text NOT NULL DEFAULT '',
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.almoner_report_status NOT NULL DEFAULT 'draft',
  finalised_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.almoner_reports TO authenticated;
GRANT ALL ON public.almoner_reports TO service_role;

ALTER TABLE public.almoner_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Almoner access can view reports"
ON public.almoner_reports FOR SELECT TO authenticated
USING (public.can_access_almoner(auth.uid()));

CREATE POLICY "Almoner access can create reports"
ON public.almoner_reports FOR INSERT TO authenticated
WITH CHECK (public.can_access_almoner(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Almoner access can update reports"
ON public.almoner_reports FOR UPDATE TO authenticated
USING (public.can_access_almoner(auth.uid()))
WITH CHECK (public.can_access_almoner(auth.uid()));

CREATE POLICY "Admins can delete reports"
ON public.almoner_reports FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER almoner_reports_set_updated_at
BEFORE UPDATE ON public.almoner_reports
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX almoner_reports_created_at_idx ON public.almoner_reports (created_at DESC);
