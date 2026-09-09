CREATE OR REPLACE FUNCTION public.get_admin_profiles()
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'full_name', p.full_name,
    'title', p.title,
    'first_name', p.first_name,
    'middle_name', p.middle_name,
    'last_name', p.last_name,
    'preferred_name', p.preferred_name,
    'post_nominals', p.post_nominals,
    'provincial_rank', p.provincial_rank,
    'grand_rank', p.grand_rank,
    'initiation_date', p.initiation_date,
    'rank', p.rank,
    'mother_lodge', p.mother_lodge,
    'status', p.status,
    'status_changed_at', p.status_changed_at,
    'degree', p.degree,
    'is_past_master', p.is_past_master,
    'is_royal_arch', p.is_royal_arch,
    'is_honorary_member', p.is_honorary_member,
    'is_ugle_portal_registered', p.is_ugle_portal_registered,
    'passing_date', p.passing_date,
    'raising_date', p.raising_date,
    'joined_lodge_date', p.joined_lodge_date,
    'created_at', p.created_at
  )
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
  ORDER BY p.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_admin_profiles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_profiles() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_profiles() TO service_role;