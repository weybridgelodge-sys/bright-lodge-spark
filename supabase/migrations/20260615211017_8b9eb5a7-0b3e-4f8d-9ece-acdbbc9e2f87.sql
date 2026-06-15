
-- Add Past Master flag and Installed Masters ritual tier
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_past_master boolean NOT NULL DEFAULT false;

-- Extend masonic_degree enum with installed_master (for ritual_documents.required_degree)
ALTER TYPE public.masonic_degree ADD VALUE IF NOT EXISTS 'installed_master';

-- Prevent members from self-promoting to Past Master
CREATE OR REPLACE FUNCTION public.prevent_past_master_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_past_master IS DISTINCT FROM OLD.is_past_master
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change Past Master status';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_past_master_self_edit ON public.profiles;
CREATE TRIGGER trg_prevent_past_master_self_edit
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_past_master_self_edit();
