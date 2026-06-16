
ALTER TABLE public.ritual_documents ADD COLUMN IF NOT EXISTS is_general boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Members view ritual docs at their degree" ON public.ritual_documents;

CREATE POLICY "Members view ritual docs at their degree"
ON public.ritual_documents
FOR SELECT
USING (
  is_active_member(auth.uid()) AND (
    is_general
    OR degree_level(required_degree) <= COALESCE(current_user_degree_level(auth.uid()), 0)
    OR (required_degree = 'installed_master'::masonic_degree AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_past_master = true
    ))
  )
);
