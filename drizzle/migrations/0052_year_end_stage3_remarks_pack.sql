ALTER TABLE public.treasurer_year_approvals ADD COLUMN IF NOT EXISTS treasurer_remarks text;
ALTER TABLE public.treasurer_year_approvals ADD COLUMN IF NOT EXISTS certified_pack_path text;
ALTER TABLE public.treasurer_year_approvals ADD COLUMN IF NOT EXISTS certified_pack_at timestamptz;
ALTER TABLE public.treasurer_year_approval_rounds ADD COLUMN IF NOT EXISTS treasurer_remarks text;

-- Draft remarks: Treasurer/admin, any status.
CREATE OR REPLACE FUNCTION public.save_year_remarks(_year integer, _remarks text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::public.app_role) OR public.is_current_officer(auth.uid(),'treasurer')) THEN
    RAISE EXCEPTION 'Only the Treasurer can edit the Treasurer''s Remarks';
  END IF;
  INSERT INTO public.treasurer_year_approvals (masonic_year, treasurer_remarks) VALUES (_year, NULLIF(btrim(_remarks),''))
  ON CONFLICT (masonic_year) DO UPDATE SET treasurer_remarks = EXCLUDED.treasurer_remarks;
END $$;
REVOKE ALL ON FUNCTION public.save_year_remarks(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_year_remarks(integer, text) TO authenticated;

-- Submit now also freezes the current remarks into the round.
CREATE OR REPLACE FUNCTION public.submit_year_for_audit(_year integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_status text; v_round integer; v_snap jsonb; v_remarks text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::public.app_role) OR public.is_current_officer(auth.uid(),'treasurer')) THEN
    RAISE EXCEPTION 'Only the Treasurer can submit the accounts for audit review';
  END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries e JOIN public.treasurer_periods p ON p.id = e.period_id
             WHERE p.period_type='closing' AND p.masonic_year=_year AND e.source_type='year_close') THEN
    RAISE EXCEPTION 'FY %/% is already closed', _year, _year+1;
  END IF;
  INSERT INTO public.treasurer_year_approvals (masonic_year) VALUES (_year) ON CONFLICT (masonic_year) DO NOTHING;
  SELECT id, status, round_number, treasurer_remarks INTO v_id, v_status, v_round, v_remarks
    FROM public.treasurer_year_approvals WHERE masonic_year=_year FOR UPDATE;
  IF v_status NOT IN ('draft','query') THEN
    RAISE EXCEPTION 'FY %/% is already % — it can only be (re)submitted from Draft or Query raised', _year, _year+1, v_status;
  END IF;
  v_snap := public.year_audit_snapshot(_year);
  v_round := v_round + 1;
  INSERT INTO public.treasurer_year_approval_rounds (approval_id, round_number, figures_snapshot, submitted_by, treasurer_remarks)
    VALUES (v_id, v_round, v_snap, auth.uid(), v_remarks);
  UPDATE public.treasurer_year_approvals SET status='submitted', round_number=v_round, figures_snapshot=v_snap,
    submitted_at=now(), submitted_by=auth.uid() WHERE id=v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_year_for_audit(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_year_for_audit(integer) TO authenticated;

-- Live (unsubmitted) figures in the same shape, for the DRAFT pack.
CREATE OR REPLACE FUNCTION public.year_live_snapshot(_year integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_view_year_audit(auth.uid()) THEN RAISE EXCEPTION 'Not permitted'; END IF;
  RETURN public.year_audit_snapshot(_year);
END $$;
REVOKE ALL ON FUNCTION public.year_live_snapshot(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.year_live_snapshot(integer) TO authenticated;

-- Record the stored certified pack once; never overwritten.
CREATE OR REPLACE FUNCTION public.record_certified_pack(_approval_id uuid, _path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text; v_path text; v_year integer;
BEGIN
  IF NOT public.can_view_year_audit(auth.uid()) THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT status, certified_pack_path, masonic_year INTO v_status, v_path, v_year
    FROM public.treasurer_year_approvals WHERE id=_approval_id FOR UPDATE;
  IF v_status IS DISTINCT FROM 'approved' THEN RAISE EXCEPTION 'Only approved accounts have a certified pack'; END IF;
  IF v_path IS NOT NULL THEN RETURN; END IF;
  IF _path NOT LIKE 'year-end-accounts/FY' || v_year || '-%' THEN RAISE EXCEPTION 'Invalid pack path'; END IF;
  UPDATE public.treasurer_year_approvals SET certified_pack_path=_path, certified_pack_at=now() WHERE id=_approval_id;
END $$;
REVOKE ALL ON FUNCTION public.record_certified_pack(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_certified_pack(uuid, text) TO authenticated;

-- Storage: year-audit readers may add (not replace/delete) certified packs and read them.
CREATE POLICY "Year audit packs insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lodge-docs' AND name LIKE 'year-end-accounts/%' AND public.can_view_year_audit(auth.uid()));
CREATE POLICY "Year audit packs read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lodge-docs' AND name LIKE 'year-end-accounts/%' AND public.can_view_year_audit(auth.uid()));