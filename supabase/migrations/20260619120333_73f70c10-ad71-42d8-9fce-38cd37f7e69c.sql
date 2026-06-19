REVOKE EXECUTE ON FUNCTION public.can_edit_charity(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_charity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_charity(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_charity(uuid) TO authenticated, service_role;