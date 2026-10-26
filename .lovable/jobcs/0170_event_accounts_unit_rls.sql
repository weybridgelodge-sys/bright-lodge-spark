-- Job CS / 0170: add the same-lodge test to every existing rule on public.event_accounts.
-- ROLLBACK (original rules, verbatim): drop each policy below and recreate:
-- CREATE POLICY "event_accounts_delete" ON public.event_accounts FOR DELETE TO authenticated
--   USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text));
-- CREATE POLICY "event_accounts_delete_public_mgr" ON public.event_accounts FOR DELETE TO authenticated
--   USING (can_manage_public_events(auth.uid()));
-- CREATE POLICY "event_accounts_insert" ON public.event_accounts FOR INSERT TO authenticated
--   WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text));
-- CREATE POLICY "event_accounts_insert_public_mgr" ON public.event_accounts FOR INSERT TO authenticated
--   WITH CHECK (can_manage_public_events(auth.uid()));
-- CREATE POLICY "event_accounts_select" ON public.event_accounts FOR SELECT TO authenticated
--   USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text) OR is_current_officer(auth.uid(), 'auditor_1'::text) OR is_current_officer(auth.uid(), 'auditor_2'::text) OR is_current_officer(auth.uid(), 'worshipful_master'::text));
-- CREATE POLICY "event_accounts_select_public_mgr" ON public.event_accounts FOR SELECT TO authenticated
--   USING (can_manage_public_events(auth.uid()));
-- CREATE POLICY "event_accounts_update" ON public.event_accounts FOR UPDATE TO authenticated
--   USING (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text))
--   WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text));
-- CREATE POLICY "event_accounts_update_public_mgr" ON public.event_accounts FOR UPDATE TO authenticated
--   USING (can_manage_public_events(auth.uid()))
--   WITH CHECK (can_manage_public_events(auth.uid()));

DROP POLICY IF EXISTS "event_accounts_delete" ON public.event_accounts;
CREATE POLICY "event_accounts_delete" ON public.event_accounts FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text)) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "event_accounts_delete_public_mgr" ON public.event_accounts;
CREATE POLICY "event_accounts_delete_public_mgr" ON public.event_accounts FOR DELETE TO authenticated
  USING ((can_manage_public_events(auth.uid())) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "event_accounts_insert" ON public.event_accounts;
CREATE POLICY "event_accounts_insert" ON public.event_accounts FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text)) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "event_accounts_insert_public_mgr" ON public.event_accounts;
CREATE POLICY "event_accounts_insert_public_mgr" ON public.event_accounts FOR INSERT TO authenticated
  WITH CHECK ((can_manage_public_events(auth.uid())) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "event_accounts_select" ON public.event_accounts;
CREATE POLICY "event_accounts_select" ON public.event_accounts FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text) OR is_current_officer(auth.uid(), 'auditor_1'::text) OR is_current_officer(auth.uid(), 'auditor_2'::text) OR is_current_officer(auth.uid(), 'worshipful_master'::text)) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "event_accounts_select_public_mgr" ON public.event_accounts;
CREATE POLICY "event_accounts_select_public_mgr" ON public.event_accounts FOR SELECT TO authenticated
  USING ((can_manage_public_events(auth.uid())) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "event_accounts_update" ON public.event_accounts;
CREATE POLICY "event_accounts_update" ON public.event_accounts FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text)) AND unit_id = public.my_unit())
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR is_current_officer(auth.uid(), 'treasurer'::text)) AND unit_id = public.my_unit());

DROP POLICY IF EXISTS "event_accounts_update_public_mgr" ON public.event_accounts;
CREATE POLICY "event_accounts_update_public_mgr" ON public.event_accounts FOR UPDATE TO authenticated
  USING ((can_manage_public_events(auth.uid())) AND unit_id = public.my_unit())
  WITH CHECK ((can_manage_public_events(auth.uid())) AND unit_id = public.my_unit());
