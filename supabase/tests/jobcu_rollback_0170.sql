-- Job CU rollback for 0170: restores the original live policies (pre-0170). Run as owner.
DROP POLICY IF EXISTS "event_accounts_delete" ON public.event_accounts;
DROP POLICY IF EXISTS "event_accounts_delete_public_mgr" ON public.event_accounts;
DROP POLICY IF EXISTS "event_accounts_insert" ON public.event_accounts;
DROP POLICY IF EXISTS "event_accounts_insert_public_mgr" ON public.event_accounts;
DROP POLICY IF EXISTS "event_accounts_select" ON public.event_accounts;
DROP POLICY IF EXISTS "event_accounts_select_public_mgr" ON public.event_accounts;
DROP POLICY IF EXISTS "event_accounts_update" ON public.event_accounts;
DROP POLICY IF EXISTS "event_accounts_update_public_mgr" ON public.event_accounts;
CREATE POLICY "event_accounts_delete" ON public.event_accounts AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text));
CREATE POLICY "event_accounts_delete_public_mgr" ON public.event_accounts AS PERMISSIVE FOR DELETE TO authenticated
  USING (can_manage_public_events(auth.uid()));
CREATE POLICY "event_accounts_insert" ON public.event_accounts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text));
CREATE POLICY "event_accounts_insert_public_mgr" ON public.event_accounts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (can_manage_public_events(auth.uid()));
CREATE POLICY "event_accounts_select" ON public.event_accounts AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text) OR is_current_officer(auth.uid(), 'auditor_1'::text) OR is_current_officer(auth.uid(), 'auditor_2'::text) OR is_current_officer(auth.uid(), 'worshipful_master'::text));
CREATE POLICY "event_accounts_select_public_mgr" ON public.event_accounts AS PERMISSIVE FOR SELECT TO authenticated
  USING (can_manage_public_events(auth.uid()));
CREATE POLICY "event_accounts_update" ON public.event_accounts AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text));
CREATE POLICY "event_accounts_update_public_mgr" ON public.event_accounts AS PERMISSIVE FOR UPDATE TO authenticated
  USING (can_manage_public_events(auth.uid()))
  WITH CHECK (can_manage_public_events(auth.uid()));
