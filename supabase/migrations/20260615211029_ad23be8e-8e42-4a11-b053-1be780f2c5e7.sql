
-- Update degree_level to include installed_master, and ritual policy to gate it by is_past_master
CREATE OR REPLACE FUNCTION public.degree_level(_d masonic_degree)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _d
    WHEN 'entered_apprentice' THEN 1
    WHEN 'fellow_craft' THEN 2
    WHEN 'master_mason' THEN 3
    WHEN 'installed_master' THEN 4
  END
$$;

DROP POLICY IF EXISTS "Members view ritual docs at their degree" ON public.ritual_documents;
CREATE POLICY "Members view ritual docs at their degree"
ON public.ritual_documents
FOR SELECT
TO authenticated
USING (
  public.is_active_member(auth.uid())
  AND (
    (public.degree_level(required_degree) <= COALESCE(public.current_user_degree_level(auth.uid()), 0))
    OR (
      required_degree = 'installed_master'::masonic_degree
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_past_master = true)
    )
  )
);
