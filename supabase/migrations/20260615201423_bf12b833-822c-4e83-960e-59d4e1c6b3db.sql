
-- 1) Prevent non-admins from changing their own status (mirrors degree protection)
CREATE OR REPLACE FUNCTION public.prevent_status_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change a member''s status';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_prevent_status_self_edit ON public.profiles;
CREATE TRIGGER profiles_prevent_status_self_edit
BEFORE UPDATE OF status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_status_self_edit();

-- Make sure degree trigger is also installed (in case it wasn't wired up)
DROP TRIGGER IF EXISTS profiles_prevent_degree_self_edit ON public.profiles;
CREATE TRIGGER profiles_prevent_degree_self_edit
BEFORE UPDATE OF degree ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_degree_self_edit();

-- 2) Revoke EXECUTE on SECURITY DEFINER helpers from anon/public.
-- These are only meant to be called from RLS policies / authenticated context.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_active_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_degree_level(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.prevent_degree_self_edit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_status_self_edit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_degree_level(uuid) TO authenticated, service_role;
