DROP POLICY IF EXISTS "Editors insert development record" ON public.member_development_records;
CREATE POLICY "Editors insert development record"
ON public.member_development_records
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role)
  OR public.has_role(auth.uid(), 'secretary'::public.app_role)
);

DROP POLICY IF EXISTS "Members update own profile; admins update any" ON public.profiles;
CREATE POLICY "Members update own profile; admins update any"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR id = auth.uid());