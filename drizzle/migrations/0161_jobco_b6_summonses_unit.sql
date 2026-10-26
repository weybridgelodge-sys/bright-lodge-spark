-- ROLLBACK (original rules, verbatim):
-- CREATE POLICY "Secretaries manage summonses" ON public.summonses FOR ALL TO authenticated
--   USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'assistant_secretary'::app_role)))
--   WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'assistant_secretary'::app_role)));
-- CREATE POLICY "Active members read finalised summonses" ON public.summonses FOR SELECT TO authenticated
--   USING ((is_active_member(auth.uid()) AND ((status = ANY (ARRAY['finalised'::summons_status, 'sent'::summons_status])) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'assistant_secretary'::app_role))));
DROP POLICY "Secretaries manage summonses" ON public.summonses;
CREATE POLICY "Secretaries manage summonses" ON public.summonses FOR ALL TO authenticated
  USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'assistant_secretary')) AND unit_id = public.my_unit())
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'assistant_secretary')) AND unit_id = public.my_unit());
DROP POLICY "Active members read finalised summonses" ON public.summonses;
CREATE POLICY "Active members read finalised summonses" ON public.summonses FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()) AND unit_id = public.my_unit()
    AND (status = ANY (ARRAY['finalised'::summons_status, 'sent'::summons_status]) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'assistant_secretary')));