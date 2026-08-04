CREATE TABLE public.treasurer_dining_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL UNIQUE REFERENCES public.festive_board_meetings(id) ON DELETE CASCADE,
  invoice_headcount integer,
  per_head_pence integer,
  override_total_pence integer,
  notes text,
  transaction_id uuid REFERENCES public.treasurer_transactions(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasurer_dining_invoices TO authenticated;
GRANT ALL ON public.treasurer_dining_invoices TO service_role;

ALTER TABLE public.treasurer_dining_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dining_invoice_select" ON public.treasurer_dining_invoices
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR is_current_officer(auth.uid(), 'treasurer')
  OR is_current_officer(auth.uid(), 'auditor_1')
  OR is_current_officer(auth.uid(), 'auditor_2')
  OR is_current_officer(auth.uid(), 'worshipful_master')
);

CREATE POLICY "dining_invoice_insert" ON public.treasurer_dining_invoices
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY "dining_invoice_update" ON public.treasurer_dining_invoices
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY "dining_invoice_delete" ON public.treasurer_dining_invoices
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE TRIGGER trg_dining_invoices_updated_at
BEFORE UPDATE ON public.treasurer_dining_invoices
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();