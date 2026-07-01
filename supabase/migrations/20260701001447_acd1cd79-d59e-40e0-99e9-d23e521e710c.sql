
CREATE POLICY "Visits managers can upload lodge-visits" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lodge-visits' AND public.can_manage_visits(auth.uid()));

CREATE POLICY "Visits managers can update lodge-visits" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lodge-visits' AND public.can_manage_visits(auth.uid()))
  WITH CHECK (bucket_id = 'lodge-visits' AND public.can_manage_visits(auth.uid()));

CREATE POLICY "Visits managers can delete lodge-visits" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'lodge-visits' AND public.can_manage_visits(auth.uid()));

CREATE POLICY "Active members can read lodge-visits" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lodge-visits' AND public.is_active_member(auth.uid()));
