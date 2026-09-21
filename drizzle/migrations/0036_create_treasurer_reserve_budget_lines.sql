CREATE TABLE public.treasurer_reserve_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lodge_year_start date NOT NULL,
  lodge_year_end date NOT NULL,
  label text NOT NULL,
  pot_id uuid NOT NULL REFERENCES public.subscription_reserve_pots(id) ON DELETE CASCADE,
  amount_pence integer NOT NULL DEFAULT 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lodge_year_start, pot_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasurer_reserve_budget_lines TO authenticated;
GRANT ALL ON public.treasurer_reserve_budget_lines TO service_role;

ALTER TABLE public.treasurer_reserve_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Treasury roles can view reserve budget lines"
ON public.treasurer_reserve_budget_lines FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'secretary') OR
  public.has_role(auth.uid(), 'worshipful_master') OR
  public.is_current_officer(auth.uid(), 'treasurer') OR
  public.is_current_officer(auth.uid(), 'auditor_1') OR
  public.is_current_officer(auth.uid(), 'auditor_2')
);

CREATE POLICY "Treasurer can insert reserve budget lines"
ON public.treasurer_reserve_budget_lines FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY "Treasurer can update reserve budget lines"
ON public.treasurer_reserve_budget_lines FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_current_officer(auth.uid(), 'treasurer'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY "Treasurer can delete reserve budget lines"
ON public.treasurer_reserve_budget_lines FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_current_officer(auth.uid(), 'treasurer'));

CREATE TRIGGER tg_treasurer_reserve_budget_lines_updated_at
BEFORE UPDATE ON public.treasurer_reserve_budget_lines
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();