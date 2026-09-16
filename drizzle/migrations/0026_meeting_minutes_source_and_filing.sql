ALTER TABLE public.meeting_minutes
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS filed_document_id uuid REFERENCES public.lodge_documents(id) ON DELETE SET NULL;

ALTER TABLE public.meeting_minutes
  DROP CONSTRAINT IF EXISTS meeting_minutes_source_check;

ALTER TABLE public.meeting_minutes
  ADD CONSTRAINT meeting_minutes_source_check CHECK (source IN ('manual', 'ai_generated'));