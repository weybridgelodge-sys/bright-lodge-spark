-- JOB DB5 rollback: one section per table; restores current_unit_id() in each policy.

-- ===== installation_rule_settings =====
ALTER POLICY "Admin or Secretary insert installation rule" ON public.installation_rule_settings WITH CHECK ((unit_id = current_unit_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())));
ALTER POLICY "Admin or Secretary update installation rule" ON public.installation_rule_settings USING ((unit_id = current_unit_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid()))) WITH CHECK ((unit_id = current_unit_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())));
ALTER POLICY "Members read own unit installation rule" ON public.installation_rule_settings USING (unit_id = current_unit_id());

-- ===== meeting_diary_audit =====
ALTER POLICY "Admin or Secretary read diary audit" ON public.meeting_diary_audit USING ((unit_id = current_unit_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())));

-- ===== meeting_series =====
ALTER POLICY "Admin or Secretary insert series" ON public.meeting_series WITH CHECK ((unit_id = current_unit_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())));
ALTER POLICY "Admin or Secretary update series" ON public.meeting_series USING ((unit_id = current_unit_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid()))) WITH CHECK ((unit_id = current_unit_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())));
ALTER POLICY "Members read unit series" ON public.meeting_series USING ((unit_id = current_unit_id()) AND is_active_member(auth.uid()));

-- ===== member_status_history =====
ALTER POLICY "Admin Secretary WM read status history" ON public.member_status_history USING ((unit_id = current_unit_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid()) OR has_role(auth.uid(), 'worshipful_master'::app_role) OR is_current_officer(auth.uid(), 'worshipful_master'::text)));
ALTER POLICY "Admin or Secretary delete status history" ON public.member_status_history USING ((unit_id = current_unit_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())));
ALTER POLICY "Admin or Secretary update status history" ON public.member_status_history USING ((unit_id = current_unit_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid()))) WITH CHECK ((unit_id = current_unit_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())));
ALTER POLICY "Admin or Secretary write status history" ON public.member_status_history WITH CHECK ((unit_id = current_unit_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())));

-- ===== officer_installation_dates =====
ALTER POLICY "Admin or Secretary manage installation dates" ON public.officer_installation_dates USING ((unit_id = current_unit_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid()))) WITH CHECK ((unit_id = current_unit_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())));

-- ===== unit_settings =====
ALTER POLICY "Active members read own unit settings" ON public.unit_settings USING (is_active_member(auth.uid()) AND (unit_id = current_unit_id()));
ALTER POLICY "Admin or Secretary insert own unit settings" ON public.unit_settings WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())) AND (unit_id = current_unit_id()));
ALTER POLICY "Admin or Secretary update own unit settings" ON public.unit_settings USING ((has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())) AND (unit_id = current_unit_id())) WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR is_lodge_secretary(auth.uid())) AND (unit_id = current_unit_id()));

-- ===== unit_settings_audit =====
ALTER POLICY "Unit setup viewers read own unit audit" ON public.unit_settings_audit USING (can_view_unit_setup(auth.uid()) AND (unit_id = current_unit_id()));

-- ===== officer_installation_dates read policy (0186) =====
ALTER POLICY "Members read installation dates" ON public.officer_installation_dates USING (true);
