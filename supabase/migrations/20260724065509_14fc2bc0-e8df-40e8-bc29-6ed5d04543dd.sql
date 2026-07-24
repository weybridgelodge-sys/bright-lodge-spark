
-- 1) Prevent members from self-elevating privileged profile columns
CREATE OR REPLACE FUNCTION public.prevent_privileged_profile_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.office            IS DISTINCT FROM OLD.office
  OR NEW.rank              IS DISTINCT FROM OLD.rank
  OR NEW.provincial_rank   IS DISTINCT FROM OLD.provincial_rank
  OR NEW.grand_rank        IS DISTINCT FROM OLD.grand_rank
  OR NEW.ugle_reg_number   IS DISTINCT FROM OLD.ugle_reg_number
  OR NEW.is_honorary_member IS DISTINCT FROM OLD.is_honorary_member
  OR NEW.is_royal_arch     IS DISTINCT FROM OLD.is_royal_arch
  OR NEW.royal_arch_date   IS DISTINCT FROM OLD.royal_arch_date
  OR NEW.initiation_date   IS DISTINCT FROM OLD.initiation_date
  OR NEW.passing_date      IS DISTINCT FROM OLD.passing_date
  OR NEW.raising_date      IS DISTINCT FROM OLD.raising_date
  OR NEW.joined_lodge_date IS DISTINCT FROM OLD.joined_lodge_date
  OR NEW.joined_year       IS DISTINCT FROM OLD.joined_year
  OR NEW.mother_lodge      IS DISTINCT FROM OLD.mother_lodge
  OR NEW.proposer          IS DISTINCT FROM OLD.proposer
  THEN
    RAISE EXCEPTION 'Only admins can change privileged profile fields (rank, office, dates, registration, memberships)';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_privileged_profile_self_edit ON public.profiles;
CREATE TRIGGER trg_prevent_privileged_profile_self_edit
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_privileged_profile_self_edit();

-- 2) Restrict poll_votes SELECT so individual votes are not exposed prematurely
DROP POLICY IF EXISTS "Active members can read votes for visible polls" ON public.poll_votes;

CREATE POLICY "Members read their own vote"
ON public.poll_votes
FOR SELECT
TO authenticated
USING (member_id = auth.uid());

CREATE POLICY "Members read others' votes only when results are public"
ON public.poll_votes
FOR SELECT
TO authenticated
USING (
  public.is_active_member(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_votes.poll_id
      AND (
        p.results_visibility = 'live'
        OR p.status = 'closed'
        OR (p.closes_at IS NOT NULL AND p.closes_at <= now())
      )
  )
);

-- Admins/officers can always see for management
CREATE POLICY "Officers can read all votes"
ON public.poll_votes
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::public.app_role)
  OR public.has_role(auth.uid(),'secretary'::public.app_role)
  OR public.has_role(auth.uid(),'worshipful_master'::public.app_role)
);
