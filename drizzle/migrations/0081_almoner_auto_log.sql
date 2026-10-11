ALTER TABLE public.welfare_log_entries
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS system_reason text,
  ADD COLUMN IF NOT EXISTS system_key text;

CREATE UNIQUE INDEX IF NOT EXISTS welfare_log_entries_system_key_uq
  ON public.welfare_log_entries (member_id, system_key) WHERE system_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_welfare_log_system_rows()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' OR current_user IN ('postgres','supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_system OR NEW.system_key IS NOT NULL OR NEW.system_reason IS NOT NULL THEN
      RAISE EXCEPTION 'System welfare entries can only be created automatically';
    END IF;
    RETURN NEW;
  END IF;
  -- UPDATE
  IF NEW.is_system IS DISTINCT FROM OLD.is_system
     OR NEW.system_key IS DISTINCT FROM OLD.system_key
     OR NEW.system_reason IS DISTINCT FROM OLD.system_reason THEN
    RAISE EXCEPTION 'System markers cannot be changed';
  END IF;
  IF OLD.is_system AND (
       NEW.member_id IS DISTINCT FROM OLD.member_id
    OR NEW.contact_date IS DISTINCT FROM OLD.contact_date
    OR NEW.contact_type IS DISTINCT FROM OLD.contact_type
    OR NEW.contact_nature IS DISTINCT FROM OLD.contact_nature
    OR NEW.nature_detail IS DISTINCT FROM OLD.nature_detail
    OR NEW.notes IS DISTINCT FROM OLD.notes
    OR NEW.action_taken IS DISTINCT FROM OLD.action_taken
    OR NEW.follow_up_date IS DISTINCT FROM OLD.follow_up_date
    OR NEW.logged_by IS DISTINCT FROM OLD.logged_by) THEN
    RAISE EXCEPTION 'System welfare entries cannot be edited; dismiss instead';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_welfare_log_system_rows ON public.welfare_log_entries;
CREATE TRIGGER trg_guard_welfare_log_system_rows
  BEFORE INSERT OR UPDATE ON public.welfare_log_entries
  FOR EACH ROW EXECUTE FUNCTION public.guard_welfare_log_system_rows();