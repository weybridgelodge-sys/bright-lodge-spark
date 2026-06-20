-- 1) Hide unsubscribe_token from editor SELECTs (edge functions use service_role, which retains access)
REVOKE SELECT (unsubscribe_token) ON public.newsletter_subscribers FROM authenticated;
REVOKE SELECT (unsubscribe_token) ON public.newsletter_subscribers FROM anon;

-- 2) Tighten the public INSERT policy on newsletter_subscribers (was WITH CHECK true)
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(trim(email)) BETWEEN 5 AND 254
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND unsubscribed_at IS NULL
  );

-- 3) Restrict can_edit_newsletter to signed-in users only
REVOKE EXECUTE ON FUNCTION public.can_edit_newsletter(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_edit_newsletter(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_edit_newsletter(uuid) TO authenticated, service_role;