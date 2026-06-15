
-- 1. Degree enum
CREATE TYPE public.masonic_degree AS ENUM ('entered_apprentice','fellow_craft','master_mason');

-- 2. Add degree to profiles (default EA)
ALTER TABLE public.profiles
  ADD COLUMN degree public.masonic_degree NOT NULL DEFAULT 'entered_apprentice';

-- 3. Helper: numeric level for a degree
CREATE OR REPLACE FUNCTION public.degree_level(_d public.masonic_degree)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _d
    WHEN 'entered_apprentice' THEN 1
    WHEN 'fellow_craft' THEN 2
    WHEN 'master_mason' THEN 3
  END
$$;

-- 4. Helper: current user's degree level (security definer to bypass RLS on profiles)
CREATE OR REPLACE FUNCTION public.current_user_degree_level(_user_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.degree_level(degree) FROM public.profiles WHERE id = _user_id
$$;

-- 5. Lock degree column: only admins can change it
CREATE OR REPLACE FUNCTION public.prevent_degree_self_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.degree IS DISTINCT FROM OLD.degree
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change a member''s degree';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER profiles_degree_admin_only
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_degree_self_edit();

-- 6. Ritual documents table
CREATE TABLE public.ritual_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  required_degree public.masonic_degree NOT NULL DEFAULT 'entered_apprentice',
  file_path text NOT NULL,
  file_size_bytes integer,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ritual_documents TO authenticated;
GRANT ALL ON public.ritual_documents TO service_role;

ALTER TABLE public.ritual_documents ENABLE ROW LEVEL SECURITY;

-- Active members see docs at or below their degree (cumulative)
CREATE POLICY "Members view ritual docs at their degree"
  ON public.ritual_documents FOR SELECT TO authenticated
  USING (
    public.is_active_member(auth.uid())
    AND public.degree_level(required_degree) <= COALESCE(public.current_user_degree_level(auth.uid()), 0)
  );

CREATE POLICY "Admins manage ritual docs"
  ON public.ritual_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ritual_documents_set_updated_at
BEFORE UPDATE ON public.ritual_documents
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 7. Storage policies for ritual-docs bucket
-- Admins: full control
CREATE POLICY "Admins manage ritual-docs storage"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'ritual-docs' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'ritual-docs' AND public.has_role(auth.uid(), 'admin'));

-- Active members: read files referenced by a ritual_documents row at or below their degree
CREATE POLICY "Members read ritual-docs by degree"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ritual-docs'
    AND public.is_active_member(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.ritual_documents rd
      WHERE rd.file_path = storage.objects.name
        AND public.degree_level(rd.required_degree) <= COALESCE(public.current_user_degree_level(auth.uid()), 0)
    )
  );
