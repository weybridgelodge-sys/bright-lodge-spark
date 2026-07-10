
DO $$ BEGIN
  CREATE TYPE public.ritual_doc_type AS ENUM ('text', 'audio', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.ritual_documents
  ADD COLUMN IF NOT EXISTS doc_type public.ritual_doc_type NOT NULL DEFAULT 'text';

UPDATE public.ritual_documents SET doc_type = 'video'
  WHERE title ILIKE '%First Degree Working Tools Video%';
