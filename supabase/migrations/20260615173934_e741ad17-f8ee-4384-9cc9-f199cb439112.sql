CREATE TYPE public.doc_category_new AS ENUM (
  'summons',
  'meeting_minutes',
  'committee_minutes',
  'committee_agendas',
  'media_files',
  'ritual',
  'other'
);

ALTER TABLE public.lodge_documents 
ALTER COLUMN category DROP DEFAULT;

ALTER TABLE public.lodge_documents 
ALTER COLUMN category TYPE public.doc_category_new 
USING category::text::public.doc_category_new;

ALTER TABLE public.lodge_documents 
ALTER COLUMN category SET DEFAULT 'other'::public.doc_category_new;

DROP TYPE public.doc_category;

ALTER TYPE public.doc_category_new RENAME TO doc_category;