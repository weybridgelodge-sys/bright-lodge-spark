
ALTER TABLE public.lodge_documents
  ADD COLUMN IF NOT EXISTS required_degree public.masonic_degree,
  ADD COLUMN IF NOT EXISTS is_general boolean NOT NULL DEFAULT true;
