-- JOB DB5 (0188). Original (PERMISSIVE, SELECT, authenticated):
-- "Unit setup viewers read own unit audit" USING (can_view_unit_setup(auth.uid()) AND (unit_id = current_unit_id()))
ALTER POLICY "Unit setup viewers read own unit audit" ON public.unit_settings_audit USING (can_view_unit_setup(auth.uid()) AND (unit_id = public.my_unit()));