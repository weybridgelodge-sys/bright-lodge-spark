-- Job CS / 0169: add the same-lodge test to every existing rule on public.event_bookings.
-- ROLLBACK (original rules, verbatim): drop each policy below and recreate:
-- CREATE POLICY "event_bookings_delete" ON public.event_bookings FOR DELETE TO authenticated
--   USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text));
-- CREATE POLICY "event_bookings_insert" ON public.event_bookings FOR INSERT TO authenticated
--   WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text));
-- CREATE POLICY "event_bookings_select" ON public.event_bookings FOR SELECT TO authenticated
--   USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text) OR is_current_officer(auth.uid(), 'auditor_1'::text) OR is_current_officer(auth.uid(), 'auditor_2'::text) OR is_current_officer(auth.uid(), 'worshipful_master'::text));
-- CREATE POLICY "event_bookings_update" ON public.event_bookings FOR UPDATE TO authenticated
--   USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text))
--   WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text));

DROP POLICY IF EXISTS "event_bookings_delete" ON public.event_bookings;
CREATE POLICY "event_bookings_delete" ON public.event_bookings FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text)) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "event_bookings_insert" ON public.event_bookings;
CREATE POLICY "event_bookings_insert" ON public.event_bookings FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text)) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "event_bookings_select" ON public.event_bookings;
CREATE POLICY "event_bookings_select" ON public.event_bookings FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text) OR is_current_officer(auth.uid(), 'auditor_1'::text) OR is_current_officer(auth.uid(), 'auditor_2'::text) OR is_current_officer(auth.uid(), 'worshipful_master'::text)) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "event_bookings_update" ON public.event_bookings;
CREATE POLICY "event_bookings_update" ON public.event_bookings FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text)) AND unit_id = public.my_unit())
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text)) AND unit_id = public.my_unit());
