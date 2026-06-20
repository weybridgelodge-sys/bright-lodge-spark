-- Tighten newsletter_subscribers PII access: only admin/secretary/WM may read or mutate raw subscriber rows.
-- Working-group members go through edge functions (service_role) for broadcasts.
DROP POLICY IF EXISTS "Editors can view subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Editors can update subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Editors can delete subscribers" ON public.newsletter_subscribers;

CREATE POLICY "Admin/Secretary/WM can view subscribers"
  ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'secretary'::public.app_role)
    OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role)
  );

CREATE POLICY "Admin/Secretary/WM can update subscribers"
  ON public.newsletter_subscribers FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'secretary'::public.app_role)
    OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role)
  );

CREATE POLICY "Admin/Secretary/WM can delete subscribers"
  ON public.newsletter_subscribers FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'secretary'::public.app_role)
    OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role)
  );

-- Revoke anon EXECUTE on SECURITY DEFINER PII RPCs. These already gate by auth.uid(),
-- but should not be callable without a session.
REVOKE EXECUTE ON FUNCTION public.get_profiles_pii(uuid[]) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_summons_dining_contacts(uuid[]) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profiles_pii(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_summons_dining_contacts(uuid[]) TO authenticated;