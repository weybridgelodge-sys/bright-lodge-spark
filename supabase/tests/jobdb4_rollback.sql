-- JOB DB4 rollback: drop the six fill triggers and restore DEFAULT current_unit_id().
DROP TRIGGER IF EXISTS festive_board_meetings_fill_unit ON public.festive_board_meetings;
DROP TRIGGER IF EXISTS meeting_series_fill_unit ON public.meeting_series;
DROP TRIGGER IF EXISTS officer_installation_dates_fill_unit ON public.officer_installation_dates;
DROP TRIGGER IF EXISTS installation_rule_settings_fill_unit ON public.installation_rule_settings;
DROP TRIGGER IF EXISTS meeting_diary_audit_fill_unit ON public.meeting_diary_audit;
DROP TRIGGER IF EXISTS member_status_history_fill_unit ON public.member_status_history;
ALTER TABLE public.festive_board_meetings ALTER COLUMN unit_id SET DEFAULT public.current_unit_id();
ALTER TABLE public.meeting_series ALTER COLUMN unit_id SET DEFAULT public.current_unit_id();
ALTER TABLE public.officer_installation_dates ALTER COLUMN unit_id SET DEFAULT public.current_unit_id();
ALTER TABLE public.installation_rule_settings ALTER COLUMN unit_id SET DEFAULT public.current_unit_id();
ALTER TABLE public.meeting_diary_audit ALTER COLUMN unit_id SET DEFAULT public.current_unit_id();
ALTER TABLE public.member_status_history ALTER COLUMN unit_id SET DEFAULT public.current_unit_id();
