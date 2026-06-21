
CREATE TABLE public.charity_periodic_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  notes text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  finalised_at timestamptz,
  finalised_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT charity_periodic_reports_range_chk CHECK (end_date >= start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.charity_periodic_reports TO authenticated;
GRANT ALL ON public.charity_periodic_reports TO service_role;

ALTER TABLE public.charity_periodic_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view periodic reports" ON public.charity_periodic_reports
  FOR SELECT TO authenticated
  USING (public.can_view_charity(auth.uid()));

CREATE POLICY "insert periodic reports" ON public.charity_periodic_reports
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_charity(auth.uid()));

CREATE POLICY "update periodic reports" ON public.charity_periodic_reports
  FOR UPDATE TO authenticated
  USING (public.can_edit_charity(auth.uid()) AND finalised_at IS NULL)
  WITH CHECK (public.can_edit_charity(auth.uid()));

CREATE POLICY "delete periodic reports" ON public.charity_periodic_reports
  FOR DELETE TO authenticated
  USING (public.can_edit_charity(auth.uid()) AND finalised_at IS NULL);

CREATE TRIGGER trg_charity_periodic_reports_updated
  BEFORE UPDATE ON public.charity_periodic_reports
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_charity_periodic_reports_range ON public.charity_periodic_reports (start_date, end_date);
