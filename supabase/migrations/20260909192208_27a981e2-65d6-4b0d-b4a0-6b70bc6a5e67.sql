CREATE TABLE public.lodge_property_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  value_pence integer NOT NULL DEFAULT 0,
  condition text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lodge_property_items TO authenticated;
GRANT ALL ON public.lodge_property_items TO service_role;

ALTER TABLE public.lodge_property_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_items_select" ON public.lodge_property_items
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR is_current_officer(auth.uid(), 'treasurer')
  OR is_current_officer(auth.uid(), 'auditor_1')
  OR is_current_officer(auth.uid(), 'auditor_2')
  OR is_current_officer(auth.uid(), 'worshipful_master')
);

CREATE POLICY "property_items_insert" ON public.lodge_property_items
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY "property_items_update" ON public.lodge_property_items
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY "property_items_delete" ON public.lodge_property_items
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE TRIGGER trg_lodge_property_items_updated_at
BEFORE UPDATE ON public.lodge_property_items
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();