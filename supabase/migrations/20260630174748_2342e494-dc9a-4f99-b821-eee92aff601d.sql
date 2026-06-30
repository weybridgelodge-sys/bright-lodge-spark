
DROP POLICY IF EXISTS "welfare attachments select" ON storage.objects;
DROP POLICY IF EXISTS "welfare attachments insert" ON storage.objects;
DROP POLICY IF EXISTS "welfare attachments delete" ON storage.objects;

CREATE POLICY "welfare attachments select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'welfare-attachments' AND public.can_access_almoner(auth.uid()));
CREATE POLICY "welfare attachments insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'welfare-attachments' AND public.can_access_almoner(auth.uid()));
CREATE POLICY "welfare attachments delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'welfare-attachments' AND public.can_access_almoner(auth.uid()));
