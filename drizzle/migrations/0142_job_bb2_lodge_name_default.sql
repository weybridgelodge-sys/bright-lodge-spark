-- New template rows only: no typed lodge name. Existing rows unchanged.
ALTER TABLE public.lodge_template ALTER COLUMN lodge_name SET DEFAULT '';