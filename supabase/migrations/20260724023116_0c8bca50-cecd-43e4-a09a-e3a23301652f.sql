DROP POLICY IF EXISTS "Members update own profile; admins update any" ON public.profiles;
CREATE POLICY "Members update own profile; admins update any"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR id = auth.uid());