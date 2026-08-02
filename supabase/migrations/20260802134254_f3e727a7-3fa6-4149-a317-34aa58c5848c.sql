DROP POLICY IF EXISTS "Active members can read lodge-visits" ON storage.objects;

CREATE POLICY "Active members can read attached lodge-visit summonses"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lodge-visits'
  AND (
    public.can_manage_visits(auth.uid())
    OR (
      public.is_active_member(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.lodge_visits v
        WHERE v.summons_storage_path = storage.objects.name
      )
    )
  )
);