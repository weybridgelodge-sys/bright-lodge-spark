CREATE TABLE public.lodge_property_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_item_id uuid NOT NULL REFERENCES public.lodge_property_items(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_lodge_property_images_item ON public.lodge_property_images(property_item_id);

GRANT SELECT, INSERT, DELETE ON public.lodge_property_images TO authenticated;
GRANT ALL ON public.lodge_property_images TO service_role;

ALTER TABLE public.lodge_property_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_images_select" ON public.lodge_property_images
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR is_current_officer(auth.uid(), 'treasurer')
  OR is_current_officer(auth.uid(), 'auditor_1')
  OR is_current_officer(auth.uid(), 'auditor_2')
  OR is_current_officer(auth.uid(), 'worshipful_master')
);

CREATE POLICY "property_images_insert" ON public.lodge_property_images
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY "property_images_delete" ON public.lodge_property_images
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'));

CREATE POLICY "property images read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'lodge-property-images' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'secretary'::app_role)
    OR is_current_officer(auth.uid(), 'treasurer')
    OR is_current_officer(auth.uid(), 'auditor_1')
    OR is_current_officer(auth.uid(), 'auditor_2')
    OR is_current_officer(auth.uid(), 'worshipful_master')
  )
);

CREATE POLICY "property images insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lodge-property-images'
  AND (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'))
);

CREATE POLICY "property images delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'lodge-property-images'
  AND (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'))
);