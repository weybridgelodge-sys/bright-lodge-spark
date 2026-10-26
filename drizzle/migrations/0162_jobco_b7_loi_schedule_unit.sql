-- ROLLBACK (original rules, verbatim):
-- CREATE POLICY "Active members read LOI schedule" ON public.loi_schedule_entries FOR SELECT TO authenticated USING (is_active_member(auth.uid()));
-- CREATE POLICY "Secretariat insert LOI schedule" ON public.loi_schedule_entries FOR INSERT TO authenticated
--   WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'assistant_secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)));
-- CREATE POLICY "Secretariat update LOI schedule" ON public.loi_schedule_entries FOR UPDATE TO authenticated
--   USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'assistant_secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)))
--   WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'assistant_secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)));
-- CREATE POLICY "Secretariat delete LOI schedule" ON public.loi_schedule_entries FOR DELETE TO authenticated
--   USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'assistant_secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)));
DROP POLICY "Active members read LOI schedule" ON public.loi_schedule_entries;
CREATE POLICY "Active members read LOI schedule" ON public.loi_schedule_entries FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()) AND unit_id = public.my_unit());
DROP POLICY "Secretariat insert LOI schedule" ON public.loi_schedule_entries;
CREATE POLICY "Secretariat insert LOI schedule" ON public.loi_schedule_entries FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'assistant_secretary') OR public.has_role(auth.uid(),'worshipful_master')) AND unit_id = public.my_unit());
DROP POLICY "Secretariat update LOI schedule" ON public.loi_schedule_entries;
CREATE POLICY "Secretariat update LOI schedule" ON public.loi_schedule_entries FOR UPDATE TO authenticated
  USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'assistant_secretary') OR public.has_role(auth.uid(),'worshipful_master')) AND unit_id = public.my_unit())
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'assistant_secretary') OR public.has_role(auth.uid(),'worshipful_master')) AND unit_id = public.my_unit());
DROP POLICY "Secretariat delete LOI schedule" ON public.loi_schedule_entries;
CREATE POLICY "Secretariat delete LOI schedule" ON public.loi_schedule_entries FOR DELETE TO authenticated
  USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'assistant_secretary') OR public.has_role(auth.uid(),'worshipful_master')) AND unit_id = public.my_unit());