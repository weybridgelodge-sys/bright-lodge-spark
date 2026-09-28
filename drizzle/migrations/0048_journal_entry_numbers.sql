CREATE SEQUENCE IF NOT EXISTS public.journal_entry_number_seq AS integer START 1;

ALTER TABLE public.journal_entries ADD COLUMN entry_number integer DEFAULT 0;

-- Backfill without bumping updated_at: the only trigger on journal_entries is
-- the updated_at stamp; it is disabled only for this statement and re-enabled
-- in the same transaction. There are no period-lock triggers on this table.
ALTER TABLE public.journal_entries DISABLE TRIGGER journal_entries_set_updated_at;
WITH o AS (
  SELECT id, row_number() OVER (ORDER BY entry_date, created_at, id) AS rn
  FROM public.journal_entries
)
UPDATE public.journal_entries je SET entry_number = o.rn FROM o WHERE o.id = je.id;
ALTER TABLE public.journal_entries ENABLE TRIGGER journal_entries_set_updated_at;

SELECT setval('public.journal_entry_number_seq', GREATEST((SELECT COALESCE(max(entry_number),0) FROM public.journal_entries), 1), (SELECT count(*) > 0 FROM public.journal_entries));
ALTER SEQUENCE public.journal_entry_number_seq OWNED BY public.journal_entries.entry_number;

ALTER TABLE public.journal_entries ALTER COLUMN entry_number SET NOT NULL;
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_entry_number_key UNIQUE (entry_number);
COMMENT ON COLUMN public.journal_entries.entry_number IS 'Permanent document number (shown as JE-000123). Always assigned by trigger from journal_entry_number_seq; client-supplied values are ignored; cannot be changed. Gaps from deleted entries are expected.';

CREATE OR REPLACE FUNCTION public.tg_journal_entry_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.entry_number := nextval('public.journal_entry_number_seq');
  ELSIF NEW.entry_number IS DISTINCT FROM OLD.entry_number THEN
    RAISE EXCEPTION 'Document number (entry_number) cannot be changed';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER journal_entries_entry_number
BEFORE INSERT OR UPDATE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.tg_journal_entry_number();