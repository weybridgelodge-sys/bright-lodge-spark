-- ROLLBACK (original rules, verbatim):
-- CREATE POLICY "Active members can view polls" ON public.polls FOR SELECT TO authenticated USING (is_active_member(auth.uid()));
-- CREATE POLICY "Officers can create polls" ON public.polls FOR INSERT TO authenticated
--   WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)));
-- CREATE POLICY "Officers can update polls" ON public.polls FOR UPDATE TO authenticated
--   USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)))
--   WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)));
-- CREATE POLICY "Admins can delete polls" ON public.polls FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
-- CREATE POLICY "Members can cast their own vote on open polls" ON public.poll_votes FOR INSERT TO authenticated
--   WITH CHECK (((member_id = auth.uid()) AND is_active_member(auth.uid()) AND (EXISTS ( SELECT 1 FROM polls p
--   WHERE ((p.id = poll_votes.poll_id) AND (p.status = 'open'::text) AND ((p.closes_at IS NULL) OR (p.closes_at > now())))))));
DROP POLICY "Active members can view polls" ON public.polls;
CREATE POLICY "Active members can view polls" ON public.polls FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()) AND unit_id = public.my_unit());
DROP POLICY "Officers can create polls" ON public.polls;
CREATE POLICY "Officers can create polls" ON public.polls FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'worshipful_master')) AND unit_id = public.my_unit());
DROP POLICY "Officers can update polls" ON public.polls;
CREATE POLICY "Officers can update polls" ON public.polls FOR UPDATE TO authenticated
  USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'worshipful_master')) AND unit_id = public.my_unit())
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'worshipful_master')) AND unit_id = public.my_unit());
DROP POLICY "Admins can delete polls" ON public.polls;
CREATE POLICY "Admins can delete polls" ON public.polls FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND unit_id = public.my_unit());
DROP POLICY "Members can cast their own vote on open polls" ON public.poll_votes;
CREATE POLICY "Members can cast their own vote on open polls" ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (member_id = auth.uid() AND public.is_active_member(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.polls p WHERE p.id = poll_votes.poll_id AND p.status = 'open'
      AND (p.closes_at IS NULL OR p.closes_at > now()) AND p.unit_id = public.my_unit()));