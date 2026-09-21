CREATE TABLE public.treasurer_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lodge_year_start date NOT NULL,
  lodge_year_end date NOT NULL,
  label text NOT NULL,
  account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
  amount_pence integer NOT NULL DEFAULT 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lodge_year_start, account_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasurer_budget_lines TO authenticated;
GRANT ALL ON public.treasurer_budget_lines TO service_role;

ALTER TABLE public.treasurer_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Treasury roles can view budget lines"
ON public.treasurer_budget_lines FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'secretary') OR
  public.has_role(auth.uid(), 'worshipful_master') OR
  public.is_current_officer(auth.uid(), 'treasurer') OR
  public.is_current_officer(auth.uid(), 'auditor_1') OR
  public.is_current_officer(auth.uid(), 'auditor_2')
);

CREATE POLICY "Treasurer can insert budget lines"
ON public.treasurer_budget_lines FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY "Treasurer can update budget lines"
ON public.treasurer_budget_lines FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_current_officer(auth.uid(), 'treasurer'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY "Treasurer can delete budget lines"
ON public.treasurer_budget_lines FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_current_officer(auth.uid(), 'treasurer'));

CREATE TRIGGER tg_treasurer_budget_lines_updated_at
BEFORE UPDATE ON public.treasurer_budget_lines
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.treasurer_annual_budgets
  ALTER COLUMN income_budget_pence DROP NOT NULL,
  ALTER COLUMN expenditure_budget_pence DROP NOT NULL;

COMMENT ON COLUMN public.treasurer_annual_budgets.income_budget_pence IS 'DEPRECATED: replaced by per-category rows in public.treasurer_budget_lines';
COMMENT ON COLUMN public.treasurer_annual_budgets.expenditure_budget_pence IS 'DEPRECATED: replaced by per-category rows in public.treasurer_budget_lines';