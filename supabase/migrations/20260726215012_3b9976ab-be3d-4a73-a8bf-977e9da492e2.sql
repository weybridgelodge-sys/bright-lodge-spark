DROP POLICY IF EXISTS "wga read active" ON public.working_group_activities;

CREATE POLICY "wga read mgmt or member"
ON public.working_group_activities
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role)
  OR public.has_role(auth.uid(), 'secretary'::public.app_role)
  OR public.is_working_group_lead(auth.uid(), working_group_id)
  OR public.is_working_group_member(auth.uid(), working_group_id)
);