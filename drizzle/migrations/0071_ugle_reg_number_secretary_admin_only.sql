CREATE OR REPLACE FUNCTION public.set_member_ugle_reg_number(_member uuid, _value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v text := NULLIF(btrim(coalesce(_value, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_lodge_secretary(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not permitted' USING ERRCODE = '42501';
  END IF;
  IF v IS NOT NULL AND length(v) > 40 THEN
    RAISE EXCEPTION 'Grand Lodge number is too long' USING ERRCODE = '22001';
  END IF;
  UPDATE public.profiles SET ugle_reg_number = v WHERE id = _member;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_member_ugle_reg_number(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_member_ugle_reg_number(uuid, text) TO authenticated;