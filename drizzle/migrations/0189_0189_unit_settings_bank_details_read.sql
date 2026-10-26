-- Rollback (original policy):
-- DROP POLICY "Active members read own unit settings" ON public.unit_settings;
-- CREATE POLICY "Active members read own unit settings" ON public.unit_settings AS PERMISSIVE FOR SELECT TO authenticated
--   USING (public.is_active_member(auth.uid()) AND unit_id = public.my_unit());
DROP POLICY "Active members read own unit settings" ON public.unit_settings;
CREATE POLICY "Active members read own unit settings" ON public.unit_settings AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()) AND unit_id = public.my_unit()
    AND (key <> 'bank_details'
      OR public.can_edit_unit_setup(auth.uid())
      OR public.can_view_unit_setup(auth.uid())
      OR public.is_current_officer(auth.uid(), 'treasurer')));