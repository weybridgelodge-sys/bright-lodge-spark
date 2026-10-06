CREATE OR REPLACE FUNCTION public.can_edit_almoner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(_user_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_role(_user_id, 'almoner'::public.app_role)
    OR COALESCE(public.is_current_officer(_user_id, 'almoner'), false)
    OR COALESCE(public.is_lodge_secretary(_user_id), false)), false)
$$;
CREATE OR REPLACE FUNCTION public.can_view_almoner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(_user_id IS NOT NULL AND (
    public.can_edit_almoner(_user_id)
    OR COALESCE(public.is_current_officer(_user_id, 'worshipful_master'), false)), false)
$$;