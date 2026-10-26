-- JOB DB5 (0187). Originals (PERMISSIVE, authenticated):
-- "Active members read own unit settings" SELECT USING (is_active_member(auth.uid()) AND (unit_id = current_unit_id()))
-- "Admin or Secretary insert own unit settings" INSERT WITH CHECK ((has_role(auth.uid(),'admin') OR is_lodge_secretary(auth.uid())) AND (unit_id = current_unit_id()))
-- "Admin or Secretary update own unit settings" UPDATE USING/WITH CHECK same as insert
ALTER POLICY "Active members read own unit settings" ON public.unit_settings USING (is_active_member(auth.uid()) AND (unit_id = public.my_unit()));
ALTER POLICY "Admin or Secretary insert own unit settings" ON public.unit_settings WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())) AND (unit_id = public.my_unit()));
ALTER POLICY "Admin or Secretary update own unit settings" ON public.unit_settings USING ((has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())) AND (unit_id = public.my_unit())) WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())) AND (unit_id = public.my_unit()));