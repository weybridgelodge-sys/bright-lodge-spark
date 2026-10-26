-- JOB DB-SEC stage 2: anon revokes. Rollback: supabase/tests/jobdbsec2_rollback.sql
-- A. promote_next_waitlisted (no role check; trigger runs as owner postgres)
REVOKE EXECUTE ON FUNCTION public.promote_next_waitlisted(text,uuid,integer) FROM PUBLIC, anon;
-- B. trigger functions
REVOKE EXECUTE ON FUNCTION public.event_accounts_host_unit() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.event_accounts_seed_lines_trg() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.event_accounts_type_seed_lines_trg() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.event_booking_fill_unit() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.guard_event_account_delete() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.guard_event_account_private_fields() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.guard_event_payout_allocation() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.guard_public_label() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_meeting_diary_change() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.loi_attendance_validate_part() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.prevent_privileged_profile_self_edit() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_degree_from_dates() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_bookings_auto_promote() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_ensure_member_calendar_token() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_fba_status_refresh_seen() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_festive_board_derive_event_key() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_journal_entry_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_visitor_attendances_refresh_seen() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_year_signoff_apply() FROM PUBLIC, anon;
-- C. signed-in helpers and screens (none referenced by an anon/public policy or invoker view)
REVOKE EXECUTE ON FUNCTION public.can_edit_almoner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_province_emails(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_unit_setup(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_diary(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_meeting_minutes(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_public_events(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_read_event_content(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_almoner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_unit_setup(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_year_audit(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_write_event_content(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_officer_year() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.installation_rule_date(integer,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_event_key_archived(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_representative_position(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.officer_appointment_effective(integer,date,boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.officer_year_at(date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.officer_year_start(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.seed_event_system_budget_lines(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.event_capacity_summary(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.link_booking_journal_entry(uuid,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_and_book_seats(text,uuid,integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.promote_waitlisted_by_id(uuid) FROM PUBLIC, anon;
-- D.
REVOKE EXECUTE ON FUNCTION public.get_unit_setup() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_unit_setup(text,jsonb) FROM PUBLIC, anon;
-- E. last_engagement_date: NULL-safe guard (grants unchanged: authenticated, service_role, postgres)
CREATE OR REPLACE FUNCTION public.last_engagement_date(_member uuid)
 RETURNS date
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
       coalesce(auth.role(), '') = 'service_role'
    OR (auth.uid() IS NULL AND session_user NOT IN ('authenticator', 'anon', 'authenticated'))
    OR (auth.uid() IS NOT NULL AND _member = auth.uid())
    OR (auth.uid() IS NOT NULL AND coalesce(public.can_edit_member_development(auth.uid(), _member), false))
  ) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  RETURN GREATEST(
    COALESCE((SELECT MAX(occurred_on) FROM public.member_engagement_log WHERE member_id = _member), 'epoch'::date),
    COALESCE((SELECT MAX(ls.session_date) FROM public.loi_attendance la
              JOIN public.loi_sessions ls ON ls.id = la.session_id
              WHERE la.member_id = _member), 'epoch'::date),
    COALESCE((SELECT r.last_checkin_date FROM public.member_development_records r WHERE r.member_id = _member), 'epoch'::date)
  );
END;
$function$;
-- F. tables
REVOKE ALL ON public.units, public.unit_settings, public.unit_settings_audit, public.unit_domains,
  public.member_signatures, public.signature_event_audit, public.signature_usage_audit FROM anon;
-- G. default privileges for objects created by postgres in public
-- before: tables anon=arwdDxtm; sequences anon=rwU; functions anon=X (supabase_admin defaults not changeable here)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;