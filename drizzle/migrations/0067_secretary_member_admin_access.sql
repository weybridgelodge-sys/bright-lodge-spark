CREATE OR REPLACE FUNCTION public.is_lodge_secretary(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user IS NOT NULL AND (
    public.has_role(_user, 'secretary'::public.app_role)
    OR public.is_current_officer(_user, 'secretary'))
$$;
REVOKE ALL ON FUNCTION public.is_lodge_secretary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_lodge_secretary(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_admin_profiles()
 RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', p.id, 'email', p.email, 'full_name', p.full_name, 'title', p.title,
    'first_name', p.first_name, 'middle_name', p.middle_name, 'last_name', p.last_name,
    'preferred_name', p.preferred_name, 'post_nominals', p.post_nominals,
    'provincial_rank', p.provincial_rank, 'grand_rank', p.grand_rank,
    'initiation_date', p.initiation_date, 'rank', p.rank, 'mother_lodge', p.mother_lodge,
    'status', p.status, 'status_changed_at', p.status_changed_at, 'degree', p.degree,
    'is_past_master', p.is_past_master, 'is_royal_arch', p.is_royal_arch,
    'is_honorary_member', p.is_honorary_member,
    'is_ugle_portal_registered', p.is_ugle_portal_registered,
    'passing_date', p.passing_date, 'raising_date', p.raising_date,
    'joined_lodge_date', p.joined_lodge_date, 'created_at', p.created_at
  )
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
     OR public.is_lodge_secretary(auth.uid())
  ORDER BY p.created_at DESC;
$function$;
REVOKE ALL ON FUNCTION public.get_admin_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_profiles() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_profiles_pii(_ids uuid[])
 RETURNS TABLE(id uuid, date_of_birth date, phone text, address_line1 text, address_line2 text, address_line3 text, town text, county text, postcode text, ugle_reg_number text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.date_of_birth, p.phone,
    p.address_line1, p.address_line2, p.address_line3,
    p.town, p.county, p.postcode, p.ugle_reg_number
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND (
      p.id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'secretary'::public.app_role)
      OR public.is_current_officer(auth.uid(), 'secretary')
      OR public.has_role(auth.uid(), 'worshipful_master'::public.app_role)
      OR public.has_role(auth.uid(), 'almoner'::public.app_role)
      OR public.is_current_wm_or_ipm(auth.uid())
    )
$function$;

CREATE OR REPLACE FUNCTION public.get_members_last_sign_in()
 RETURNS TABLE(user_id uuid, last_sign_in_at timestamp with time zone)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.is_lodge_secretary(auth.uid())
       OR public.has_role(auth.uid(), 'worshipful_master'::app_role)) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  RETURN QUERY SELECT u.id, u.last_sign_in_at FROM auth.users u;
END;
$function$;

CREATE POLICY "Secretary views all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_lodge_secretary(auth.uid()));