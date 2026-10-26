-- "Public can read published events" is intentionally NOT changed.
-- ROLLBACK (original rules, verbatim):
-- CREATE POLICY "Admins and secretary can read all events" ON public.lodge_events FOR SELECT TO authenticated
--   USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role)));
-- CREATE POLICY "Admins and secretary can insert events" ON public.lodge_events FOR INSERT TO authenticated
--   WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role)));
-- CREATE POLICY "Admins and secretary can update events" ON public.lodge_events FOR UPDATE TO authenticated
--   USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role)))
--   WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role)));
-- CREATE POLICY "Admins and secretary can delete events" ON public.lodge_events FOR DELETE TO authenticated
--   USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role)));
DROP POLICY "Admins and secretary can read all events" ON public.lodge_events;
CREATE POLICY "Admins and secretary can read all events" ON public.lodge_events FOR SELECT TO authenticated
  USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary')) AND unit_id = public.my_unit());
DROP POLICY "Admins and secretary can insert events" ON public.lodge_events;
CREATE POLICY "Admins and secretary can insert events" ON public.lodge_events FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary')) AND unit_id = public.my_unit());
DROP POLICY "Admins and secretary can update events" ON public.lodge_events;
CREATE POLICY "Admins and secretary can update events" ON public.lodge_events FOR UPDATE TO authenticated
  USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary')) AND unit_id = public.my_unit())
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary')) AND unit_id = public.my_unit());
DROP POLICY "Admins and secretary can delete events" ON public.lodge_events;
CREATE POLICY "Admins and secretary can delete events" ON public.lodge_events FOR DELETE TO authenticated
  USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary')) AND unit_id = public.my_unit());