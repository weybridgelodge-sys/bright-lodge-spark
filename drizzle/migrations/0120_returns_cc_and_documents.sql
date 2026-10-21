ALTER TYPE public.doc_category ADD VALUE IF NOT EXISTS 'returns';

ALTER TABLE public.provincial_return_submissions
  ADD COLUMN IF NOT EXISTS cc_emails text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lodge_document_id uuid;
ALTER TABLE public.installation_return_submissions
  ADD COLUMN IF NOT EXISTS cc_emails text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lodge_document_id uuid;

-- Single place that decides who may see the Returns category in Documents.
CREATE OR REPLACE FUNCTION public.can_view_return_documents(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user IS NOT NULL AND (
    public.has_role(_user, 'admin')
    OR (public.is_active_member(_user) AND (
      public.has_role(_user, 'secretary')
      OR public.has_role(_user, 'assistant_secretary')
      OR public.is_lodge_secretary(_user)
      OR public.is_current_officer(_user, 'secretary')
      OR public.is_current_officer(_user, 'assistant_secretary')
      OR public.is_current_officer(_user, 'treasurer')
      OR public.is_current_officer(_user, 'worshipful_master')
    ))
  )
$$;
REVOKE ALL ON FUNCTION public.can_view_return_documents(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_return_documents(uuid) TO authenticated, service_role;

-- Public pages may know only whether the officer_signatures switch is on.
CREATE OR REPLACE FUNCTION public.officer_signatures_enabled()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT value = 'true'::jsonb FROM public.module_settings WHERE key = 'officer_signatures'), false)
$$;
REVOKE ALL ON FUNCTION public.officer_signatures_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.officer_signatures_enabled() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Members view documents at their degree" ON public.lodge_documents;
CREATE POLICY "Members view documents at their degree" ON public.lodge_documents
FOR SELECT TO authenticated USING (
  category::text <> 'returns' AND is_active_member(auth.uid()) AND (
    is_general OR required_degree IS NULL
    OR degree_level(required_degree) <= COALESCE(current_user_degree_level(auth.uid()), 0)
    OR (required_degree = 'installed_master'::masonic_degree AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_past_master = true))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
CREATE POLICY "Return officers view returns" ON public.lodge_documents
FOR SELECT TO authenticated USING (category::text = 'returns' AND public.can_view_return_documents(auth.uid()));

DROP POLICY IF EXISTS "Members read lodge-docs by degree or general" ON storage.objects;
CREATE POLICY "Members read lodge-docs by degree or general" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'lodge-docs' AND is_active_member(auth.uid()) AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.lodge_documents ld WHERE ld.file_path = objects.name AND ld.category::text <> 'returns' AND (
      ld.is_general OR ld.required_degree IS NULL
      OR degree_level(ld.required_degree) <= COALESCE(current_user_degree_level(auth.uid()), 0)
      OR (ld.required_degree = 'installed_master'::masonic_degree AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_past_master = true))
    ))
  )
);
CREATE POLICY "Return officers read returns files" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'lodge-docs' AND name LIKE 'returns/%' AND public.can_view_return_documents(auth.uid())
  AND EXISTS (SELECT 1 FROM public.lodge_documents ld WHERE ld.file_path = objects.name AND ld.category::text = 'returns')
);