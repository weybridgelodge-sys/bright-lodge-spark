DROP POLICY IF EXISTS "Tracker roles delete appointments" ON public.officer_appointments;
CREATE POLICY "Tracker roles delete appointments" ON public.officer_appointments AS PERMISSIVE FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "Tracker roles insert appointments" ON public.officer_appointments;
CREATE POLICY "Tracker roles insert appointments" ON public.officer_appointments AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "Tracker roles read appointments" ON public.officer_appointments;
CREATE POLICY "Tracker roles read appointments" ON public.officer_appointments AS PERMISSIVE FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "Tracker roles update appointments" ON public.officer_appointments;
CREATE POLICY "Tracker roles update appointments" ON public.officer_appointments AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)) AND unit_id = public.my_unit())
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role)) AND unit_id = public.my_unit());