ALTER TABLE public.candidates ADD COLUMN initiation_scheduled_date date;

COMMENT ON COLUMN public.candidates.initiation_scheduled_date IS 'Tentative or scheduled initiation date for the candidate';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;