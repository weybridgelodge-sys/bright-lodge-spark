-- JOB CY: unit_id required on the 11 lodge-scoped tables. officer_positions deliberately untouched.
CREATE TRIGGER event_accounts_fill_unit BEFORE INSERT ON public.event_accounts
  FOR EACH ROW EXECUTE FUNCTION public.fill_unit_from_caller();

ALTER TABLE public.candidates           ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE public.event_accounts       ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE public.event_bookings       ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE public.lodge_events         ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE public.lodge_socials        ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE public.loi_schedule_entries ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE public.officer_appointments ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE public.polls                ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE public.secretary_returns    ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE public.summonses            ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE public.visitor_contacts     ALTER COLUMN unit_id SET NOT NULL;

ALTER TABLE public.candidates           ADD CONSTRAINT candidates_unit_id_not_blank           CHECK (btrim(unit_id) <> '');
ALTER TABLE public.event_accounts       ADD CONSTRAINT event_accounts_unit_id_not_blank       CHECK (btrim(unit_id) <> '');
ALTER TABLE public.event_bookings       ADD CONSTRAINT event_bookings_unit_id_not_blank       CHECK (btrim(unit_id) <> '');
ALTER TABLE public.lodge_events         ADD CONSTRAINT lodge_events_unit_id_not_blank         CHECK (btrim(unit_id) <> '');
ALTER TABLE public.lodge_socials        ADD CONSTRAINT lodge_socials_unit_id_not_blank        CHECK (btrim(unit_id) <> '');
ALTER TABLE public.loi_schedule_entries ADD CONSTRAINT loi_schedule_entries_unit_id_not_blank CHECK (btrim(unit_id) <> '');
ALTER TABLE public.officer_appointments ADD CONSTRAINT officer_appointments_unit_id_not_blank CHECK (btrim(unit_id) <> '');
ALTER TABLE public.polls                ADD CONSTRAINT polls_unit_id_not_blank                CHECK (btrim(unit_id) <> '');
ALTER TABLE public.secretary_returns    ADD CONSTRAINT secretary_returns_unit_id_not_blank    CHECK (btrim(unit_id) <> '');
ALTER TABLE public.summonses            ADD CONSTRAINT summonses_unit_id_not_blank            CHECK (btrim(unit_id) <> '');
ALTER TABLE public.visitor_contacts     ADD CONSTRAINT visitor_contacts_unit_id_not_blank     CHECK (btrim(unit_id) <> '');

-- ROLLBACK (also in supabase/tests/jobcy_rollback.sql):
-- ALTER TABLE public.<t> DROP CONSTRAINT <t>_unit_id_not_blank;   -- for each of the 11 tables
-- ALTER TABLE public.<t> ALTER COLUMN unit_id DROP NOT NULL;       -- for each of the 11 tables
-- DROP TRIGGER event_accounts_fill_unit ON public.event_accounts;