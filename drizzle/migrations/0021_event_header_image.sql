ALTER TABLE public.lodge_events ADD COLUMN IF NOT EXISTS header_image_url TEXT;

CREATE POLICY "Event images readable by anyone"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'event-images');

CREATE POLICY "Admins and secretary manage event images insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary')));

CREATE POLICY "Admins and secretary manage event images update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary')));

CREATE POLICY "Admins and secretary manage event images delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary')));