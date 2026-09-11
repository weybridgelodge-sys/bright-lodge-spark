DROP POLICY IF EXISTS "engagement insert mgmt" ON public.member_engagement_log;

CREATE POLICY "engagement insert mgmt"
ON public.member_engagement_log
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'worshipful_master'::app_role)
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR can_edit_member_development(auth.uid(), member_id)
);