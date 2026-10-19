ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unit_id text NOT NULL DEFAULT 'weybridge';
CREATE INDEX IF NOT EXISTS profiles_unit_id_idx ON public.profiles(unit_id);