
DROP POLICY IF EXISTS "Active members view documents" ON public.lodge_documents;
CREATE POLICY "Members view documents at their degree"
ON public.lodge_documents
FOR SELECT
TO authenticated
USING (
  public.is_active_member(auth.uid()) AND (
    is_general
    OR required_degree IS NULL
    OR public.degree_level(required_degree) <= COALESCE(public.current_user_degree_level(auth.uid()), 0)
    OR (
      required_degree = 'installed_master'::public.masonic_degree
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_past_master = true)
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Active members read lodge-docs" ON storage.objects;
CREATE POLICY "Members read lodge-docs by degree or general"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lodge-docs'
  AND public.is_active_member(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.lodge_documents ld
      WHERE ld.file_path = storage.objects.name
        AND (
          ld.is_general
          OR ld.required_degree IS NULL
          OR public.degree_level(ld.required_degree) <= COALESCE(public.current_user_degree_level(auth.uid()), 0)
          OR (
            ld.required_degree = 'installed_master'::public.masonic_degree
            AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_past_master = true)
          )
        )
    )
  )
);
