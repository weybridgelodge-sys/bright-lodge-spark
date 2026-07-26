
ALTER TABLE public.treasurer_transactions
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_size integer;

-- Storage RLS on treasurer-attachments bucket
CREATE POLICY "treasurer_attach_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'treasurer-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'secretary'::public.app_role)
    OR public.is_current_officer(auth.uid(), 'treasurer')
    OR public.is_current_officer(auth.uid(), 'auditor_1')
    OR public.is_current_officer(auth.uid(), 'auditor_2')
    OR public.is_current_officer(auth.uid(), 'worshipful_master')
  )
);

CREATE POLICY "treasurer_attach_write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'treasurer-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_current_officer(auth.uid(), 'treasurer')
  )
);

CREATE POLICY "treasurer_attach_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'treasurer-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_current_officer(auth.uid(), 'treasurer')
  )
);

CREATE POLICY "treasurer_attach_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'treasurer-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_current_officer(auth.uid(), 'treasurer')
  )
);
