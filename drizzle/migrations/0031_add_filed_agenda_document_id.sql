ALTER TABLE public.meeting_minutes
  ADD COLUMN IF NOT EXISTS filed_agenda_document_id uuid
  REFERENCES public.lodge_documents(id) ON DELETE SET NULL;