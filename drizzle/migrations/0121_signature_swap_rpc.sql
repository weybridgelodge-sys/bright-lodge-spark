CREATE OR REPLACE FUNCTION public.swap_member_signature(_row jsonb, _actor uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _prev uuid;
BEGIN
  SELECT id INTO _prev FROM public.member_signatures WHERE member_id = (_row->>'member_id')::uuid AND active FOR UPDATE;
  IF _prev IS NOT NULL THEN
    UPDATE public.member_signatures SET active = false, revoked_at = now(), revoked_by = _actor WHERE id = _prev;
  END IF;
  INSERT INTO public.member_signatures (id, unit_id, member_id, storage_path, content_type, width, height, byte_size, source, consent_note, consent_date, consent_recorded_by, created_by)
  VALUES ((_row->>'id')::uuid, (_row->>'unit_id')::uuid, (_row->>'member_id')::uuid, _row->>'storage_path', 'image/png',
    (_row->>'width')::int, (_row->>'height')::int, (_row->>'byte_size')::int, _row->>'source',
    _row->>'consent_note', NULLIF(_row->>'consent_date','')::date, NULLIF(_row->>'consent_recorded_by','')::uuid, _actor);
  RETURN _prev;
END $$;
REVOKE ALL ON FUNCTION public.swap_member_signature(jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.swap_member_signature(jsonb, uuid) TO service_role;