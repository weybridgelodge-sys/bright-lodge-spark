-- 1. Add 'newsletter' to doc_category enum if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'doc_category' AND e.enumlabel = 'newsletter'
  ) THEN
    ALTER TYPE public.doc_category ADD VALUE 'newsletter';
  END IF;
END$$;

-- 2. Editors can insert/update/delete draft broadcasts (not sent ones)
CREATE POLICY "Editors can create broadcasts"
ON public.newsletter_broadcasts
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_newsletter(auth.uid()));

CREATE POLICY "Editors can update draft broadcasts"
ON public.newsletter_broadcasts
FOR UPDATE
TO authenticated
USING (public.can_edit_newsletter(auth.uid()) AND status IN ('draft','ready_to_send'))
WITH CHECK (public.can_edit_newsletter(auth.uid()) AND status IN ('draft','ready_to_send','sending'));

CREATE POLICY "Editors can delete draft broadcasts"
ON public.newsletter_broadcasts
FOR DELETE
TO authenticated
USING (public.can_edit_newsletter(auth.uid()) AND status IN ('draft','ready_to_send'));