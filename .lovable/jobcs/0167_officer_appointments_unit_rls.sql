-- Job CS / 0167: add the same-lodge test to every existing rule on public.officer_appointments.
-- ROLLBACK (original rules, verbatim): drop each policy below and recreate:
-- CREATE POLICY "Representative appointments delete admin or Secretary" ON public.officer_appointments FOR DELETE TO authenticated
--   USING ((NOT is_representative_position(position_key)) OR has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid()));
-- CREATE POLICY "Representative appointments insert admin or Secretary" ON public.officer_appointments FOR INSERT TO authenticated
--   WITH CHECK ((NOT is_representative_position(position_key)) OR has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid()));
-- CREATE POLICY "Representative appointments update admin or Secretary" ON public.officer_appointments FOR UPDATE TO authenticated
--   USING ((NOT is_representative_position(position_key)) OR has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid()))
--   WITH CHECK ((NOT is_representative_position(position_key)) OR has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid()));
-- CREATE POLICY "Tracker roles delete appointments" ON public.officer_appointments FOR DELETE TO authenticated
--   USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role));
-- CREATE POLICY "Tracker roles insert appointments" ON public.officer_appointments FOR INSERT TO authenticated
--   WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role));
-- CREATE POLICY "Tracker roles read appointments" ON public.officer_appointments FOR SELECT TO authenticated
--   USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role));
-- CREATE POLICY "Tracker roles update appointments" ON public.officer_appointments FOR UPDATE TO authenticated
--   USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role))
--   WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role));

DROP POLICY IF EXISTS "Representative appointments delete admin or Secretary" ON public.officer_appointments;
CREATE POLICY "Representative appointments delete admin or Secretary" ON public.officer_appointments FOR DELETE TO authenticated
  USING (((NOT is_representative_position(position_key)) OR has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "Representative appointments insert admin or Secretary" ON public.officer_appointments;
CREATE POLICY "Representative appointments insert admin or Secretary" ON public.officer_appointments FOR INSERT TO authenticated
  WITH CHECK (((NOT is_representative_position(position_key)) OR has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "Representative appointments update admin or Secretary" ON public.officer_appointments;
CREATE POLICY "Representative appointments update admin or Secretary" ON public.officer_appointments FOR UPDATE TO authenticated
  USING (((NOT is_representative_position(position_key)) OR has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())) AND unit_id = public.my_unit())
  WITH CHECK (((NOT is_representative_position(position_key)) OR has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "Tracker roles delete appointments" ON public.officer_appointments;
CREATE POLICY "Tracker roles delete appointments" ON public.officer_appointments FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "Tracker roles insert appointments" ON public.officer_appointments;
CREATE POLICY "Tracker roles insert appointments" ON public.officer_appointments FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "Tracker roles read appointments" ON public.officer_appointments;
CREATE POLICY "Tracker roles read appointments" ON public.officer_appointments FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "Tracker roles update appointments" ON public.officer_appointments;
CREATE POLICY "Tracker roles update appointments" ON public.officer_appointments FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)) AND unit_id = public.my_unit())
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)) AND unit_id = public.my_unit());
