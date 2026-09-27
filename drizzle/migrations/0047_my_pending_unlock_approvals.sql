CREATE OR REPLACE FUNCTION public.get_my_pending_unlock_approvals()
RETURNS TABLE(id uuid, label text, unlock_reason text, unlock_requested_at timestamptz, needs_treasurer boolean, needs_secretary boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH me AS (
    SELECT public.is_current_officer(auth.uid(),'treasurer') AS t,
           public.is_current_officer(auth.uid(),'secretary') AS s
  )
  SELECT p.id, p.label, p.unlock_reason, p.unlock_requested_at,
         (me.t AND NOT p.unlock_approved_by_treasurer),
         (me.s AND NOT p.unlock_approved_by_secretary)
  FROM public.treasurer_periods p, me
  WHERE p.status = 'locked' AND p.unlock_requested_by IS NOT NULL
    AND ((me.t AND NOT p.unlock_approved_by_treasurer) OR (me.s AND NOT p.unlock_approved_by_secretary))
  ORDER BY p.period_start;
$$;
REVOKE ALL ON FUNCTION public.get_my_pending_unlock_approvals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_pending_unlock_approvals() TO authenticated;