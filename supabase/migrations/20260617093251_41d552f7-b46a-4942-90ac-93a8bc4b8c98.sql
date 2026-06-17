DROP POLICY IF EXISTS "Members read ritual-docs by degree" ON storage.objects;

CREATE POLICY "Members read ritual-docs by degree or general"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ritual-docs'
  AND public.is_active_member(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.ritual_documents rd
    WHERE rd.file_path = storage.objects.name
      AND (
        rd.is_general = true
        OR public.degree_level(rd.required_degree) <= COALESCE(public.current_user_degree_level(auth.uid()), 0)
      )
  )
);