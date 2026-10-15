ALTER TABLE public.event_accounts
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS modules jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS deposit_percent numeric(6,3),
  ADD COLUMN IF NOT EXISTS balance_due_date date,
  ADD COLUMN IF NOT EXISTS fee_cover_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS og_image_url text;

ALTER TABLE public.event_accounts
  ADD CONSTRAINT event_accounts_event_type_chk CHECK (event_type IN ('simple','dinner_festival')),
  ADD CONSTRAINT event_accounts_payment_mode_chk CHECK (payment_mode IN ('full','full_or_deposit')),
  ADD CONSTRAINT event_accounts_deposit_pct_chk CHECK (deposit_percent IS NULL OR (deposit_percent > 0 AND deposit_percent < 100)),
  ADD CONSTRAINT event_accounts_seo_len_chk CHECK ((seo_title IS NULL OR length(seo_title) <= 70) AND (seo_description IS NULL OR length(seo_description) <= 170));

CREATE OR REPLACE FUNCTION public.event_accounts_payment_schedule_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.payment_mode = 'full_or_deposit' THEN
    IF NEW.deposit_percent IS NULL THEN RAISE EXCEPTION 'Deposit percent is required for deposit payments'; END IF;
    IF NEW.balance_due_date IS NULL THEN RAISE EXCEPTION 'Balance due date is required for deposit payments'; END IF;
    IF NEW.balance_due_date > NEW.event_date THEN RAISE EXCEPTION 'Balance due date must be on or before the event date'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER event_accounts_payment_schedule_validate
  BEFORE INSERT OR UPDATE OF payment_mode, deposit_percent, balance_due_date, event_date
  ON public.event_accounts FOR EACH ROW EXECUTE FUNCTION public.event_accounts_payment_schedule_validate();

CREATE OR REPLACE FUNCTION public.is_event_published(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.event_accounts e
    WHERE e.id = _event_id AND e.is_public AND e.slug IS NOT NULL AND e.archived_at IS NULL)
$$;
CREATE OR REPLACE FUNCTION public.can_read_event_content(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (public.can_manage_public_events(_uid)
    OR public.has_role(_uid,'secretary'::public.app_role)
    OR public.is_current_officer(_uid,'treasurer') OR public.is_current_officer(_uid,'auditor_1')
    OR public.is_current_officer(_uid,'auditor_2') OR public.is_current_officer(_uid,'worshipful_master'))
$$;
CREATE OR REPLACE FUNCTION public.can_write_event_content(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (public.has_role(_uid,'admin'::public.app_role)
    OR public.is_current_officer(_uid,'treasurer') OR public.can_manage_public_events(_uid))
$$;
GRANT EXECUTE ON FUNCTION public.is_event_published(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_event_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_event_content(uuid) TO authenticated;

CREATE TABLE public.event_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.event_accounts(id) ON DELETE CASCADE,
  menu_set text NOT NULL DEFAULT 'adult' CHECK (menu_set IN ('adult','child')),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_courses_event_idx ON public.event_courses(event_id, menu_set, sort_order);

CREATE TABLE public.event_course_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.event_courses(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.event_accounts(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (length(trim(label)) > 0),
  description text,
  dietary_tags text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_course_options_course_idx ON public.event_course_options(course_id, sort_order);
CREATE INDEX event_course_options_event_idx ON public.event_course_options(event_id);

CREATE TABLE public.event_catalogue_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.event_accounts(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_catalogue_categories_event_idx ON public.event_catalogue_categories(event_id, sort_order);

CREATE TABLE public.event_catalogue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.event_catalogue_categories(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.event_accounts(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text,
  unit_note text,
  price_pence integer NOT NULL CHECK (price_pence >= 0),
  kind text NOT NULL DEFAULT 'drink' CHECK (kind IN ('drink','voucher')),
  max_per_booking integer CHECK (max_per_booking IS NULL OR max_per_booking > 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_catalogue_items_category_idx ON public.event_catalogue_items(category_id, sort_order);
CREATE INDEX event_catalogue_items_event_idx ON public.event_catalogue_items(event_id);

CREATE TABLE public.event_info_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.event_accounts(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'custom' CHECK (kind IN ('hotel','charity','sponsor','dress','timings','custom')),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  body text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_path text,
  image_alt text,
  link_url text CHECK (link_url IS NULL OR link_url ~* '^https://'),
  visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_info_blocks_event_idx ON public.event_info_blocks(event_id, sort_order);

CREATE OR REPLACE FUNCTION public.event_child_parent_match()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'event_course_options' THEN
    IF NOT EXISTS (SELECT 1 FROM public.event_courses c WHERE c.id = NEW.course_id AND c.event_id = NEW.event_id)
      THEN RAISE EXCEPTION 'Option event does not match course event'; END IF;
  ELSIF TG_TABLE_NAME = 'event_catalogue_items' THEN
    IF NOT EXISTS (SELECT 1 FROM public.event_catalogue_categories c WHERE c.id = NEW.category_id AND c.event_id = NEW.event_id)
      THEN RAISE EXCEPTION 'Item event does not match category event'; END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER event_course_options_match BEFORE INSERT OR UPDATE ON public.event_course_options
  FOR EACH ROW EXECUTE FUNCTION public.event_child_parent_match();
CREATE TRIGGER event_catalogue_items_match BEFORE INSERT OR UPDATE ON public.event_catalogue_items
  FOR EACH ROW EXECUTE FUNCTION public.event_child_parent_match();
CREATE TRIGGER event_courses_updated_at BEFORE UPDATE ON public.event_courses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER event_catalogue_categories_updated_at BEFORE UPDATE ON public.event_catalogue_categories
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER event_info_blocks_updated_at BEFORE UPDATE ON public.event_info_blocks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['event_courses','event_course_options','event_catalogue_categories','event_catalogue_items','event_info_blocks'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can_read_event_content(auth.uid()) OR public.can_write_event_content(auth.uid()))', t||'_staff_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_write_event_content(auth.uid()))', t||'_writer_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_write_event_content(auth.uid())) WITH CHECK (public.can_write_event_content(auth.uid()))', t||'_writer_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can_write_event_content(auth.uid()))', t||'_writer_delete', t);
  END LOOP;
END $$;
CREATE POLICY event_courses_public_read ON public.event_courses FOR SELECT TO anon, authenticated
  USING (public.is_event_published(event_id));
CREATE POLICY event_course_options_public_read ON public.event_course_options FOR SELECT TO anon, authenticated
  USING (active AND public.is_event_published(event_id));
CREATE POLICY event_catalogue_categories_public_read ON public.event_catalogue_categories FOR SELECT TO anon, authenticated
  USING (public.is_event_published(event_id));
CREATE POLICY event_catalogue_items_public_read ON public.event_catalogue_items FOR SELECT TO anon, authenticated
  USING (active AND public.is_event_published(event_id));
CREATE POLICY event_info_blocks_public_read ON public.event_info_blocks FOR SELECT TO anon, authenticated
  USING (visible AND public.is_event_published(event_id));

-- Atomic copy of module content into a freshly duplicated draft.
CREATE OR REPLACE FUNCTION public.duplicate_event_content(_src uuid, _dst uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE r record; new_id uuid;
BEGIN
  IF NOT public.can_write_event_content(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _src = _dst THEN RAISE EXCEPTION 'Source and target must differ'; END IF;
  IF EXISTS (SELECT 1 FROM public.event_bookings WHERE event_id = _dst) THEN RAISE EXCEPTION 'Target event already has bookings'; END IF;
  IF EXISTS (SELECT 1 FROM public.event_courses WHERE event_id = _dst)
     OR EXISTS (SELECT 1 FROM public.event_catalogue_categories WHERE event_id = _dst)
     OR EXISTS (SELECT 1 FROM public.event_info_blocks WHERE event_id = _dst) THEN
    RAISE EXCEPTION 'Target event already has content';
  END IF;
  FOR r IN SELECT * FROM public.event_courses WHERE event_id = _src LOOP
    INSERT INTO public.event_courses(event_id, menu_set, name, sort_order)
      VALUES (_dst, r.menu_set, r.name, r.sort_order) RETURNING id INTO new_id;
    INSERT INTO public.event_course_options(course_id, event_id, label, description, dietary_tags, active, sort_order)
      SELECT new_id, _dst, o.label, o.description, o.dietary_tags, o.active, o.sort_order
      FROM public.event_course_options o WHERE o.course_id = r.id;
  END LOOP;
  FOR r IN SELECT * FROM public.event_catalogue_categories WHERE event_id = _src LOOP
    INSERT INTO public.event_catalogue_categories(event_id, name, sort_order)
      VALUES (_dst, r.name, r.sort_order) RETURNING id INTO new_id;
    INSERT INTO public.event_catalogue_items(category_id, event_id, name, description, unit_note, price_pence, kind, max_per_booking, active, sort_order)
      SELECT new_id, _dst, i.name, i.description, i.unit_note, i.price_pence, i.kind, i.max_per_booking, i.active, i.sort_order
      FROM public.event_catalogue_items i WHERE i.category_id = r.id;
  END LOOP;
  INSERT INTO public.event_info_blocks(event_id, kind, title, body, details, image_path, image_alt, link_url, visible, sort_order)
    SELECT _dst, b.kind, b.title, b.body, b.details, b.image_path, b.image_alt, b.link_url, b.visible, b.sort_order
    FROM public.event_info_blocks b WHERE b.event_id = _src;
END $$;
REVOKE ALL ON FUNCTION public.duplicate_event_content(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_event_content(uuid, uuid) TO authenticated;

-- Storage: private bucket; files stored as <event_id>/<file>. Public may read files of published events (via signed URLs).
CREATE POLICY "Event content images public read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'event-content-images'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    AND public.is_event_published(((storage.foldername(name))[1])::uuid));
CREATE POLICY "Event content images staff read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'event-content-images' AND (public.can_read_event_content(auth.uid()) OR public.can_write_event_content(auth.uid())));
CREATE POLICY "Event content images writer insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-content-images' AND public.can_write_event_content(auth.uid())
    AND lower(name) ~ '\.(jpe?g|png|webp)$');
CREATE POLICY "Event content images writer update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-content-images' AND public.can_write_event_content(auth.uid()))
  WITH CHECK (bucket_id = 'event-content-images' AND public.can_write_event_content(auth.uid()) AND lower(name) ~ '\.(jpe?g|png|webp)$');
CREATE POLICY "Event content images writer delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-content-images' AND public.can_write_event_content(auth.uid()));