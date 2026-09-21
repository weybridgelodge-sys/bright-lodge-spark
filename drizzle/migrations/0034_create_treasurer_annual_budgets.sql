CREATE TABLE public.treasurer_annual_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lodge_year_start date NOT NULL,
  lodge_year_end date NOT NULL,
  label text NOT NULL,
  income_budget_pence integer NOT NULL DEFAULT 0,
  expenditure_budget_pence integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lodge_year_start)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasurer_annual_budgets TO authenticated;
GRANT ALL ON public.treasurer_annual_budgets TO service_role;

ALTER TABLE public.treasurer_annual_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY treasurer_annual_budgets_select ON public.treasurer_annual_budgets
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR is_current_officer(auth.uid(), 'treasurer')
  OR is_current_officer(auth.uid(), 'auditor_1')
  OR is_current_officer(auth.uid(), 'auditor_2')
  OR is_current_officer(auth.uid(), 'worshipful_master')
);

CREATE POLICY treasurer_annual_budgets_insert ON public.treasurer_annual_budgets
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY treasurer_annual_budgets_update ON public.treasurer_annual_budgets
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE TRIGGER treasurer_annual_budgets_updated_at
BEFORE UPDATE ON public.treasurer_annual_budgets
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();