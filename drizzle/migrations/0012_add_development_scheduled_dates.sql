ALTER TABLE public.member_development_records
  ADD COLUMN passing_scheduled_date date,
  ADD COLUMN raising_scheduled_date date;

COMMENT ON COLUMN public.member_development_records.passing_scheduled_date IS 'Planned passing date for the member';
COMMENT ON COLUMN public.member_development_records.raising_scheduled_date IS 'Planned raising date for the member';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_development_records TO authenticated;
GRANT ALL ON public.member_development_records TO service_role;