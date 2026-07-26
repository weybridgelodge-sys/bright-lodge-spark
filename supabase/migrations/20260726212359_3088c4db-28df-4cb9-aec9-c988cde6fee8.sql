
REVOKE EXECUTE ON FUNCTION public.is_current_officer(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lock_treasurer_period(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_unlock_treasurer_period(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_unlock_treasurer_period(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_officer(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lock_treasurer_period(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_unlock_treasurer_period(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_unlock_treasurer_period(uuid) TO authenticated, service_role;
