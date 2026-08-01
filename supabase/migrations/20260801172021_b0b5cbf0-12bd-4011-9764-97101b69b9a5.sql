-- 1. Visible-to-all guest count (no addresses)
ALTER TABLE public.lodge_socials
  ADD COLUMN IF NOT EXISTS guest_count integer
  GENERATED ALWAYS AS (COALESCE(array_length(guest_emails, 1), 0)) STORED;

-- 2. Column-level privileges: members may read everything except guest_emails
REVOKE SELECT ON public.lodge_socials FROM authenticated;
GRANT SELECT (id, title, starts_at, ends_at, venue, description,
              notified_member_count, notified_at, created_by,
              created_at, updated_at, working_group_id, guest_count)
  ON public.lodge_socials TO authenticated;
GRANT ALL ON public.lodge_socials TO service_role;

-- anon has no policy allowing reads; remove the redundant grant too
REVOKE SELECT ON public.lodge_socials FROM anon;

-- 3. Organiser-only accessor for the actual addresses
CREATE OR REPLACE FUNCTION public.lodge_social_guest_emails(_social_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v text[];
BEGIN
  IF NOT public.can_manage_socials(auth.uid()) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  SELECT guest_emails INTO v FROM public.lodge_socials WHERE id = _social_id;
  RETURN COALESCE(v, '{}'::text[]);
END;
$$;

REVOKE ALL ON FUNCTION public.lodge_social_guest_emails(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lodge_social_guest_emails(uuid) TO authenticated, service_role;