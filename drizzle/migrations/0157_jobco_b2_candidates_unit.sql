-- ROLLBACK (original rules, verbatim):
-- CREATE POLICY "Progression managers can view candidates" ON public.candidates FOR SELECT TO authenticated
--   USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)));
-- CREATE POLICY "Progression managers can insert candidates" ON public.candidates FOR INSERT TO authenticated
--   WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)));
-- CREATE POLICY "Progression managers can update candidates" ON public.candidates FOR UPDATE TO authenticated
--   USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)));
-- CREATE POLICY "Admins can delete candidates" ON public.candidates FOR DELETE TO authenticated
--   USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY "Progression managers can view candidates" ON public.candidates;
CREATE POLICY "Progression managers can view candidates" ON public.candidates FOR SELECT TO authenticated
  USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'worshipful_master')) AND unit_id = public.my_unit());
DROP POLICY "Progression managers can insert candidates" ON public.candidates;
CREATE POLICY "Progression managers can insert candidates" ON public.candidates FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'worshipful_master')) AND unit_id = public.my_unit());
DROP POLICY "Progression managers can update candidates" ON public.candidates;
CREATE POLICY "Progression managers can update candidates" ON public.candidates FOR UPDATE TO authenticated
  USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'worshipful_master')) AND unit_id = public.my_unit())
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'worshipful_master')) AND unit_id = public.my_unit());
DROP POLICY "Admins can delete candidates" ON public.candidates;
CREATE POLICY "Admins can delete candidates" ON public.candidates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND unit_id = public.my_unit());