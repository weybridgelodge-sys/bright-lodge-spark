
-- Defence-in-depth: in addition to the existing trigger guards, add a RESTRICTIVE
-- RLS policy so that ANY update which would change degree or status must come
-- from an admin. Restrictive policies are AND-ed with permissive ones.
DROP POLICY IF EXISTS "Only admins can change degree or status" ON public.profiles;
CREATE POLICY "Only admins can change degree or status"
ON public.profiles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (
    degree IS NOT DISTINCT FROM (SELECT p.degree FROM public.profiles p WHERE p.id = profiles.id)
    AND status IS NOT DISTINCT FROM (SELECT p.status FROM public.profiles p WHERE p.id = profiles.id)
  )
);
