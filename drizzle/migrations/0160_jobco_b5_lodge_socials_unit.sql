-- ROLLBACK (original rules, verbatim):
-- CREATE POLICY "Active members can view socials" ON public.lodge_socials FOR SELECT TO authenticated USING (is_active_member(auth.uid()));
-- CREATE POLICY "Socials group can insert" ON public.lodge_socials FOR INSERT TO authenticated WITH CHECK (can_manage_socials(auth.uid()));
-- CREATE POLICY "Socials group can update" ON public.lodge_socials FOR UPDATE TO authenticated USING (can_manage_socials(auth.uid())) WITH CHECK (can_manage_socials(auth.uid()));
-- CREATE POLICY "Socials group can delete" ON public.lodge_socials FOR DELETE TO authenticated USING (can_manage_socials(auth.uid()));
DROP POLICY "Active members can view socials" ON public.lodge_socials;
CREATE POLICY "Active members can view socials" ON public.lodge_socials FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()) AND unit_id = public.my_unit());
DROP POLICY "Socials group can insert" ON public.lodge_socials;
CREATE POLICY "Socials group can insert" ON public.lodge_socials FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_socials(auth.uid()) AND unit_id = public.my_unit());
DROP POLICY "Socials group can update" ON public.lodge_socials;
CREATE POLICY "Socials group can update" ON public.lodge_socials FOR UPDATE TO authenticated
  USING (public.can_manage_socials(auth.uid()) AND unit_id = public.my_unit())
  WITH CHECK (public.can_manage_socials(auth.uid()) AND unit_id = public.my_unit());
DROP POLICY "Socials group can delete" ON public.lodge_socials;
CREATE POLICY "Socials group can delete" ON public.lodge_socials FOR DELETE TO authenticated
  USING (public.can_manage_socials(auth.uid()) AND unit_id = public.my_unit());