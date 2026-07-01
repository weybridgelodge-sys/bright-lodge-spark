
CREATE OR REPLACE FUNCTION public.get_members_last_sign_in()
RETURNS TABLE(user_id uuid, last_sign_in_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'secretary'::app_role)
       OR public.has_role(auth.uid(), 'worshipful_master'::app_role)) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  RETURN QUERY
    SELECT u.id, u.last_sign_in_at
      FROM auth.users u;
END;
$$;

REVOKE ALL ON FUNCTION public.get_members_last_sign_in() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_members_last_sign_in() TO authenticated;
