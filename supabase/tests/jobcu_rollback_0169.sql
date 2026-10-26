-- Job CU rollback for 0169: restores the original live policies (pre-0169). Run as owner.
DROP POLICY IF EXISTS "event_bookings_delete" ON public.event_bookings;
DROP POLICY IF EXISTS "event_bookings_insert" ON public.event_bookings;
DROP POLICY IF EXISTS "event_bookings_select" ON public.event_bookings;
DROP POLICY IF EXISTS "event_bookings_update" ON public.event_bookings;
CREATE POLICY "event_bookings_delete" ON public.event_bookings AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text));
CREATE POLICY "event_bookings_insert" ON public.event_bookings AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text));
CREATE POLICY "event_bookings_select" ON public.event_bookings AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text) OR is_current_officer(auth.uid(), 'auditor_1'::text) OR is_current_officer(auth.uid(), 'auditor_2'::text) OR is_current_officer(auth.uid(), 'worshipful_master'::text));
CREATE POLICY "event_bookings_update" ON public.event_bookings AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text));
