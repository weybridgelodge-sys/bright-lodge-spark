DROP POLICY IF EXISTS "Only admins can change degree or status" ON public.profiles;

CREATE POLICY "Members update own profile; admins update any"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    id = auth.uid()
    AND NOT (degree IS DISTINCT FROM (SELECT p.degree FROM public.profiles p WHERE p.id = profiles.id))
    AND NOT (status IS DISTINCT FROM (SELECT p.status FROM public.profiles p WHERE p.id = profiles.id))
  )
);