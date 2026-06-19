REVOKE EXECUTE ON FUNCTION public.can_access_almoner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_active_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_current_wm_or_ipm(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_degree_level(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_office_label(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.effective_initiation_date(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_access_almoner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_current_wm_or_ipm(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_degree_level(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_office_label(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.effective_initiation_date(uuid) TO authenticated, service_role;