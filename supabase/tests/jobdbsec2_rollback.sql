-- JOB DB-SEC stage 2 rollback (0175). Original ACLs before 0175:
--   last_engagement_date(uuid) | t | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   check_and_book_seats(text,uuid,integer) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   promote_next_waitlisted(text,uuid,integer) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   promote_waitlisted_by_id(uuid) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   tg_bookings_auto_promote() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   event_capacity_summary(uuid) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   tg_ensure_member_calendar_token() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   prevent_privileged_profile_self_edit() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   link_booking_journal_entry(uuid,uuid) | t | {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   sync_degree_from_dates() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   can_manage_meeting_minutes(uuid) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   tg_journal_entry_number() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   can_view_year_audit(uuid) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   tg_year_signoff_apply() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   officer_year_start(integer) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   current_officer_year() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   officer_year_at(date) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   officer_appointment_effective(integer,date,boolean) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   is_event_key_archived(text) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   can_edit_almoner(uuid) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   can_view_almoner(uuid) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   tg_visitor_attendances_refresh_seen() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   tg_fba_status_refresh_seen() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   can_manage_public_events(uuid) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   guard_event_account_delete() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   guard_event_account_private_fields() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   seed_event_system_budget_lines(uuid) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   event_accounts_seed_lines_trg() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   guard_event_payout_allocation() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   can_read_event_content(uuid) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   can_write_event_content(uuid) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   event_accounts_type_seed_lines_trg() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   installation_rule_date(integer,text) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   log_meeting_diary_change() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   can_manage_diary(uuid) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   guard_public_label() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   event_accounts_host_unit() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   is_representative_position(text) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   tg_festive_board_derive_event_key() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   can_edit_unit_setup(uuid) | t | {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   can_view_unit_setup(uuid) | t | {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   save_unit_setup(text,jsonb) | t | {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   get_unit_setup() | t | {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   loi_attendance_validate_part() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   can_edit_province_emails(uuid) | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   event_booking_fill_unit() | t | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
-- Tables (all identical): {postgres=arwdDxtm,anon=arwdDxtm,authenticated=arwdDxtm,service_role=arwdDxtm,sandbox_exec=ar}
-- Default ACL (FOR ROLE postgres IN SCHEMA public): tables anon=arwdDxtm, sequences anon=rwU, functions anon=X
-- Restore (functions with PUBLIC '=X' originally get PUBLIC back; the rest anon only):
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT unnest(array[
   'promote_next_waitlisted(text,uuid,integer)','event_accounts_host_unit()','event_accounts_seed_lines_trg()','event_accounts_type_seed_lines_trg()','event_booking_fill_unit()','guard_event_account_delete()','guard_event_account_private_fields()','guard_event_payout_allocation()','guard_public_label()','log_meeting_diary_change()','loi_attendance_validate_part()','prevent_privileged_profile_self_edit()','sync_degree_from_dates()','tg_bookings_auto_promote()','tg_ensure_member_calendar_token()','tg_fba_status_refresh_seen()','tg_festive_board_derive_event_key()','tg_journal_entry_number()','tg_visitor_attendances_refresh_seen()','tg_year_signoff_apply()','can_edit_almoner(uuid)','can_edit_province_emails(uuid)','can_manage_diary(uuid)','can_manage_meeting_minutes(uuid)','can_manage_public_events(uuid)','can_read_event_content(uuid)','can_view_almoner(uuid)','can_view_year_audit(uuid)','can_write_event_content(uuid)','current_officer_year()','installation_rule_date(integer,text)','is_event_key_archived(text)','is_representative_position(text)','officer_appointment_effective(integer,date,boolean)','officer_year_at(date)','officer_year_start(integer)','seed_event_system_budget_lines(uuid)','event_capacity_summary(uuid)','check_and_book_seats(text,uuid,integer)','promote_waitlisted_by_id(uuid)']) AS s
  LOOP EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO PUBLIC, anon', r.s); END LOOP;
  FOR r IN SELECT unnest(array['link_booking_journal_entry(uuid,uuid)','can_edit_unit_setup(uuid)','can_view_unit_setup(uuid)','get_unit_setup()','save_unit_setup(text,jsonb)']) AS s
  LOOP EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO anon', r.s); END LOOP;
END $$;
GRANT ALL ON public.units, public.unit_settings, public.unit_settings_audit, public.unit_domains,
  public.member_signatures, public.signature_event_audit, public.signature_usage_audit TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon;
-- last_engagement_date original body:
/*
CREATE OR REPLACE FUNCTION public.last_engagement_date(_member uuid)
 RETURNS date
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _member <> auth.uid()
     AND NOT public.can_edit_member_development(auth.uid(), _member)
  THEN
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
$function$

*/
