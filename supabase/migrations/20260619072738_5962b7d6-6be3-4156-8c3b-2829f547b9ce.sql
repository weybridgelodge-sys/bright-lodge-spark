REVOKE EXECUTE ON FUNCTION public.can_edit_member_development(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_member_ritual(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_view_skills_matrix(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_working_group_lead(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_working_group_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.last_engagement_date(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.lodge_skills_matrix() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.can_edit_member_development(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_member_ritual(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_skills_matrix(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_working_group_lead(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_working_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.last_engagement_date(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lodge_skills_matrix() TO authenticated;