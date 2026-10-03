CREATE OR REPLACE FUNCTION public.prevent_status_self_edit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT (public.is_lodge_secretary(auth.uid()) AND OLD.id <> auth.uid()) THEN
    RAISE EXCEPTION 'Only admins or the Secretary can change a member''s status';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.set_member_status(_member uuid, _status public.member_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_admin boolean := public.has_role(auth.uid(), 'admin'::public.app_role);
BEGIN
  IF auth.uid() IS NULL OR NOT (is_admin OR public.is_lodge_secretary(auth.uid())) THEN
    RAISE EXCEPTION 'Not permitted' USING ERRCODE = '42501';
  END IF;
  IF NOT is_admin THEN
    IF _member = auth.uid() THEN
      RAISE EXCEPTION 'You cannot change your own status' USING ERRCODE = '42501';
    END IF;
    IF _status NOT IN ('active', 'suspended') THEN
      RAISE EXCEPTION 'The Secretary can only approve, suspend or reactivate' USING ERRCODE = '42501';
    END IF;
  END IF;
  UPDATE public.profiles SET status = _status, status_changed_at = current_date WHERE id = _member;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_member_status(uuid, public.member_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_member_status(uuid, public.member_status) TO authenticated;