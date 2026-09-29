ALTER TABLE public.treasurer_year_approvals
  ADD COLUMN IF NOT EXISTS accounts_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS accounts_sent_with_summons_id uuid REFERENCES public.summonses(id) ON DELETE SET NULL;

-- Years whose certified accounts are ready to go out with a summons.
CREATE OR REPLACE FUNCTION public.get_attachable_accounts()
RETURNS TABLE(approval_id uuid, masonic_year integer, certified_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.id, a.masonic_year,
         (SELECT max(s.signed_at) FROM public.treasurer_year_signoffs s
           WHERE s.approval_id = a.id AND s.round_number = a.round_number AND s.decision = 'confirmed')
  FROM public.treasurer_year_approvals a
  WHERE a.status = 'approved' AND a.certified_pack_path IS NOT NULL AND a.accounts_sent_at IS NULL
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary')
         OR public.has_role(auth.uid(),'assistant_secretary') OR public.can_view_year_audit(auth.uid()))
  ORDER BY a.masonic_year DESC
$$;
REVOKE ALL ON FUNCTION public.get_attachable_accounts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_attachable_accounts() TO authenticated;

-- Write-once record, called only by the send function (service role).
CREATE OR REPLACE FUNCTION public.record_accounts_sent(_approval_id uuid, _summons_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.treasurer_year_approvals
     SET accounts_sent_at = now(), accounts_sent_with_summons_id = _summons_id, updated_at = now()
   WHERE id = _approval_id AND status = 'approved' AND certified_pack_path IS NOT NULL
     AND accounts_sent_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.record_accounts_sent(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_accounts_sent(uuid, uuid) TO service_role;