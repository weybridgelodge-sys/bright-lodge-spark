REVOKE EXECUTE ON FUNCTION public.can_manage_socials(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_visits(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_working_group_member_by_slug(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, public;