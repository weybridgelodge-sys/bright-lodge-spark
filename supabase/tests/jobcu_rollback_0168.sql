-- Job CU rollback for 0168: restores the original live policies (pre-0168). Run as owner.
DROP POLICY IF EXISTS "Admins/WM/Secretary can modify visitor contacts" ON public.visitor_contacts;
DROP POLICY IF EXISTS "Visit and summons managers can view visitor contacts" ON public.visitor_contacts;
CREATE POLICY "Admins/WM/Secretary can modify visitor contacts" ON public.visitor_contacts AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role) OR has_role(auth.uid(), 'secretary'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role) OR has_role(auth.uid(), 'secretary'::app_role));
CREATE POLICY "Visit and summons managers can view visitor contacts" ON public.visitor_contacts AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR has_role(auth.uid(), 'assistant_secretary'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role) OR has_role(auth.uid(), 'director_of_ceremonies'::app_role) OR can_manage_visits(auth.uid()) OR can_manage_socials(auth.uid()));
