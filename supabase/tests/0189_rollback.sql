-- Rollback for 0189: restore the original SELECT policy on unit_settings (pre-0189 text, verbatim from pg_policies).
DROP POLICY IF EXISTS "Active members read own unit settings" ON public.unit_settings;
CREATE POLICY "Active members read own unit settings" ON public.unit_settings AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()) AND unit_id = public.my_unit());
