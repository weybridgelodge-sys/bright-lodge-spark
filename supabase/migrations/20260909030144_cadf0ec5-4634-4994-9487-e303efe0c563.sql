DROP POLICY IF EXISTS "Editors can update draft broadcasts" ON public.newsletter_broadcasts;
CREATE POLICY "Editors can update draft broadcasts"
ON public.newsletter_broadcasts
FOR UPDATE
TO authenticated
USING (can_edit_newsletter(auth.uid()) AND status = ANY (ARRAY['draft'::text,'ready_to_send'::text]))
WITH CHECK (can_edit_newsletter(auth.uid()) AND status = ANY (ARRAY['draft'::text,'ready_to_send'::text]));