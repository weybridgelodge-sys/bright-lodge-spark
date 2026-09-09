ALTER TABLE public.charity_collections
  ADD COLUMN IF NOT EXISTS banked_date date,
  ADD COLUMN IF NOT EXISTS banked_by text,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id);

ALTER TABLE public.charity_donations
  ADD COLUMN IF NOT EXISTS banked_date date,
  ADD COLUMN IF NOT EXISTS banked_by text,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id);

CREATE OR REPLACE FUNCTION public.guard_charity_journal_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.journal_entry_id IS DISTINCT FROM OLD.journal_entry_id THEN
    IF NOT (public.has_role(auth.uid(), 'admin') OR public.is_current_officer(auth.uid(), 'treasurer')) THEN
      RAISE EXCEPTION 'Only an admin or the current Treasurer can post charity records to the accounts ledger';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_journal_link ON public.charity_collections;
CREATE TRIGGER guard_journal_link
  BEFORE UPDATE ON public.charity_collections
  FOR EACH ROW EXECUTE FUNCTION public.guard_charity_journal_link();

DROP TRIGGER IF EXISTS guard_journal_link ON public.charity_donations;
CREATE TRIGGER guard_journal_link
  BEFORE UPDATE ON public.charity_donations
  FOR EACH ROW EXECUTE FUNCTION public.guard_charity_journal_link();