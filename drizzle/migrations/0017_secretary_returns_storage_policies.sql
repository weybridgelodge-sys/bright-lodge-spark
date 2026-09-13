CREATE POLICY "secretary_returns_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'secretary-returns' AND public.can_manage_secretary_returns(auth.uid()));

CREATE POLICY "secretary_returns_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'secretary-returns' AND public.can_manage_secretary_returns(auth.uid()));

CREATE POLICY "secretary_returns_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'secretary-returns' AND public.can_manage_secretary_returns(auth.uid()));

CREATE POLICY "secretary_returns_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'secretary-returns' AND public.can_manage_secretary_returns(auth.uid()));