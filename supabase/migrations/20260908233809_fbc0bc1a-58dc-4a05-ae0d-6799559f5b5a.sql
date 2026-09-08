DROP POLICY IF EXISTS "Tracker roles can read positions" ON public.officer_positions;
CREATE POLICY "Authenticated can read positions" ON public.officer_positions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can view accounts" ON public.chart_of_accounts;
CREATE POLICY "chart_of_accounts_select" ON public.chart_of_accounts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text));