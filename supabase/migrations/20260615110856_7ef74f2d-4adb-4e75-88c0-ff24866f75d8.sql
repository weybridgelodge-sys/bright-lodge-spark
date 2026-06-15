
-- Enums
CREATE TYPE public.app_role AS ENUM ('member', 'admin');
CREATE TYPE public.member_status AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE public.doc_category AS ENUM ('summons', 'minutes', 'ritual', 'other');

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  rank text,
  office text,
  joined_year int,
  phone text,
  avatar_url text,
  status public.member_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_active_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'active')
$$;

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Active members can view active profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()) AND status = 'active');
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES policies
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- LODGE DOCUMENTS (metadata)
CREATE TABLE public.lodge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category public.doc_category NOT NULL DEFAULT 'other',
  file_path text NOT NULL,
  file_size_bytes int,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lodge_documents TO authenticated;
GRANT ALL ON public.lodge_documents TO service_role;
ALTER TABLE public.lodge_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active members view documents" ON public.lodge_documents
  FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Admins manage documents" ON public.lodge_documents
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- MEMBER NOTICES
CREATE TABLE public.member_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  event_date timestamptz,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_notices TO authenticated;
GRANT ALL ON public.member_notices TO service_role;
ALTER TABLE public.member_notices ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER notices_updated_at BEFORE UPDATE ON public.member_notices
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "Active members view notices" ON public.member_notices
  FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Admins manage notices" ON public.member_notices
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + member role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    'pending'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage policies for the lodge-docs bucket (bucket already created)
CREATE POLICY "Active members read lodge-docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lodge-docs' AND public.is_active_member(auth.uid()));
CREATE POLICY "Admins insert lodge-docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lodge-docs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update lodge-docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lodge-docs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete lodge-docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'lodge-docs' AND public.has_role(auth.uid(), 'admin'));
