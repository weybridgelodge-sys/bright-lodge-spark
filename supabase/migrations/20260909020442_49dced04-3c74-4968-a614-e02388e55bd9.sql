alter table public.journal_entries add column if not exists document_number text;
alter table public.journal_entries add column if not exists bank_reference text;