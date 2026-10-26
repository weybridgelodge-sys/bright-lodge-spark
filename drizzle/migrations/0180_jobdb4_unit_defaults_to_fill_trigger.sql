-- JOB DB4 (Job DA stage 4): replace the six unit_id DEFAULT current_unit_id() with the shared
-- fill_unit_from_caller() BEFORE INSERT trigger (row value wins; else signed-in caller's lodge; else P0001 no_unit_for_write).
-- The DB3 writers (diary RPCs, sync and audit/status triggers) already pass the row's lodge explicitly.
-- Rollback (also supabase/tests/jobdb4_rollback.sql):
--   DROP TRIGGER <table>_fill_unit ON public.<table>;  (x6)
--   ALTER TABLE public.<table> ALTER COLUMN unit_id SET DEFAULT public.current_unit_id();  (x6)
ALTER TABLE public.festive_board_meetings ALTER COLUMN unit_id DROP DEFAULT;
ALTER TABLE public.meeting_series ALTER COLUMN unit_id DROP DEFAULT;
ALTER TABLE public.officer_installation_dates ALTER COLUMN unit_id DROP DEFAULT;
ALTER TABLE public.installation_rule_settings ALTER COLUMN unit_id DROP DEFAULT;
ALTER TABLE public.meeting_diary_audit ALTER COLUMN unit_id DROP DEFAULT;
ALTER TABLE public.member_status_history ALTER COLUMN unit_id DROP DEFAULT;

CREATE TRIGGER festive_board_meetings_fill_unit BEFORE INSERT ON public.festive_board_meetings FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();
CREATE TRIGGER meeting_series_fill_unit BEFORE INSERT ON public.meeting_series FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();
CREATE TRIGGER officer_installation_dates_fill_unit BEFORE INSERT ON public.officer_installation_dates FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();
CREATE TRIGGER installation_rule_settings_fill_unit BEFORE INSERT ON public.installation_rule_settings FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();
CREATE TRIGGER meeting_diary_audit_fill_unit BEFORE INSERT ON public.meeting_diary_audit FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();
CREATE TRIGGER member_status_history_fill_unit BEFORE INSERT ON public.member_status_history FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();