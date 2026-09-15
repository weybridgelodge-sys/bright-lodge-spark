DROP POLICY IF EXISTS "Members can view visitor contacts" ON public.visitor_contacts;

CREATE POLICY "Visit and summons managers can view visitor contacts"
ON public.visitor_contacts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR has_role(auth.uid(), 'assistant_secretary'::app_role)
  OR has_role(auth.uid(), 'worshipful_master'::app_role)
  OR has_role(auth.uid(), 'director_of_ceremonies'::app_role)
  OR public.can_manage_visits(auth.uid())
  OR public.can_manage_socials(auth.uid())
);