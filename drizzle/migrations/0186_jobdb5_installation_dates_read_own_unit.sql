-- JOB DB5 (0186). Original:
-- CREATE POLICY "Members read installation dates" ON public.officer_installation_dates AS PERMISSIVE FOR SELECT TO authenticated USING (true);
ALTER POLICY "Members read installation dates" ON public.officer_installation_dates USING (unit_id = public.my_unit());