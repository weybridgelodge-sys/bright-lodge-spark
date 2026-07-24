DROP POLICY IF EXISTS "Editors insert development record" ON public.member_development_records;
CREATE POLICY "Editors insert development record"
ON public.member_development_records
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role)
  OR public.has_role(auth.uid(), 'secretary'::public.app_role)
);