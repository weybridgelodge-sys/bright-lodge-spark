CREATE OR REPLACE FUNCTION public.set_member_status(_member uuid, _status member_status)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE is_admin boolean := public.has_role(auth.uid(), 'admin'::public.app_role);
BEGIN
  IF auth.uid() IS NULL OR NOT (is_admin OR public.is_lodge_secretary(auth.uid())) THEN
    RAISE EXCEPTION 'Not permitted' USING ERRCODE = '42501';
  END IF;
  IF NOT is_admin AND _member = auth.uid() THEN
    RAISE EXCEPTION 'You cannot change your own status' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles SET status = _status, status_changed_at = current_date WHERE id = _member;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;
END $function$;