
-- Revoke EXECUTE from anon (and public) on all SECURITY DEFINER functions in public.
-- Trigger-only functions also have EXECUTE revoked from authenticated — they only
-- need to run via the trigger system (table owner).

-- Trigger-only functions: revoke from public, anon, authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_degree_self_edit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_status_self_edit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_past_master_self_edit() FROM PUBLIC, anon, authenticated;

-- Helper functions used by RLS policies / client: keep authenticated, drop anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_active_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_degree_level(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.effective_initiation_date(uuid) FROM PUBLIC, anon;
