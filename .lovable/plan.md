# Stage 2: Dinner & Festival schema and admin modules

## What I checked
- `event_accounts` policies: Admin/current Treasurer full access; `can_manage_public_events()` (Admin or `is_lodge_secretary()`) can select/insert/update/delete. SELECT also covers Secretary role, Treasurer, Auditors 1/2 and the current WM.
- `public_events` is a plain view, with no `security_invoker`. It runs as its owner and filters to `is_public AND slug IS NOT NULL AND archived_at IS NULL`. That is how drafts stay hidden today.
- Storage: there is already a private `event-images` bucket. Its policies use `has_role(...'secretary')`, not the current-Secretary helper.
- `PublicEventsAdmin.tsx` is 362 lines. Duplicate uses `buildDuplicatePayload` and then a single insert.
- `ScrollToTopButton` is fixed at `bottom-6 right-6 z-50` on every public page.

## Scope
- Schema for the event type, modules, payment schedule, fee cover and SEO.
- Four content tables (plus their child tables), the image bucket, and the admin panels.
- Duplicate Event extension.
- The back-to-top fix.
- Not in this stage: booking tables, balance columns, changes to the public page beyond hiding the button, and anything Ladies-Festival-related.

## Public read path (drafts stay hidden)
- `public_events` gets no new columns in this stage, so the view stays the same. Stage 3 will add `event_type`, `modules`, payment and SEO fields to it (CREATE OR REPLACE, with the new columns appended).
- Content tables are read directly, with an anon/authenticated SELECT policy that calls a new SECURITY DEFINER helper `is_event_published(event_id)`. The helper uses the same predicate as the view.
- An unpublished, archived or slug-less event therefore returns no courses, catalogue or blocks to the public. Inactive options/items and hidden blocks are filtered by the policy too.

## Migration SQL (additive only)

```sql
-- 1. event_accounts: new columns, all defaulted or nullable
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
-- "Deposit requires percent and due date" is checked in a trigger (the due date relates to event_date):
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

-- 2. Shared helpers
CREATE OR REPLACE FUNCTION public.is_event_published(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.event_accounts e
    WHERE e.id = _event_id AND e.is_public AND e.slug IS NOT NULL AND e.archived_at IS NULL)
$$;
CREATE OR REPLACE FUNCTION public.can_read_event_content(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (public.can_manage_public_events(_uid)
    OR public.is_current_officer(_uid,'treasurer') OR public.is_current_officer(_uid,'auditor_1')
    OR public.is_current_officer(_uid,'auditor_2') OR public.is_current_officer(_uid,'worshipful_master'))
$$;
GRANT EXECUTE ON FUNCTION public.is_event_published(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_event_content(uuid) TO authenticated;

-- 3. Courses (menu_set separates the adult and kids' menus)
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

-- 4. Catalogue
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

-- 5. Info blocks
CREATE TABLE public.event_info_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.event_accounts(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'custom' CHECK (kind IN ('hotel','charity','sponsor','dress','timings','custom')),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  body text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,   -- e.g. hotel {code, rate, phone, url, book_by}
  image_path text,                              -- storage path in event-content-images
  image_alt text,
  link_url text CHECK (link_url IS NULL OR link_url ~* '^https://'),
  visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_info_blocks_event_idx ON public.event_info_blocks(event_id, sort_order);

-- 6. Option/item event_id must match its parent (prevents cross-event links)
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
-- updated_at on the other three tables reuses the project's existing touch trigger function (name confirmed at build time).

-- 7. Grants, RLS and policies (same block for each of the 5 tables)
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['event_courses','event_course_options','event_catalogue_categories','event_catalogue_items','event_info_blocks'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can_read_event_content(auth.uid()))', t||'_staff_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_manage_public_events(auth.uid()))', t||'_mgr_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_manage_public_events(auth.uid())) WITH CHECK (public.can_manage_public_events(auth.uid()))', t||'_mgr_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can_manage_public_events(auth.uid()))', t||'_mgr_delete', t);
  END LOOP;
END $$;
-- Public reads: published events only, active/visible rows only
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

-- 8. Storage policies for the new public-read bucket "event-content-images"
--    (the bucket itself is created with the storage tool: public read, 5 MB, image/jpeg|png|webp)
CREATE POLICY "Event content images manager insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-content-images' AND public.can_manage_public_events(auth.uid()));
CREATE POLICY "Event content images manager update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-content-images' AND public.can_manage_public_events(auth.uid()));
CREATE POLICY "Event content images manager delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-content-images' AND public.can_manage_public_events(auth.uid()));
```

Notes:
- Existing rows get `simple`, `{}`, `full` and fee cover on. No backfill is needed and the Christmas party is unchanged.
- Fee cover "on" matches today's behaviour, where the fee question is offered. Checkout only starts reading `fee_cover_enabled` in stage 3.
- `modules` keys (validated in the app by a shared pure parser, defaulting to off): `courses`, `kids_menu`, `catalogue`, `deposit`, `info_blocks`, and `sections` {menu, drinks, info, hosting_lodges, highlights}.

## Admin UI
The editor in `PublicEventsAdmin.tsx` stays the shell. The new panels live in `src/components/members/public-events/`. They are desktop/tablet first and use stacking flex/grid so a phone stays usable, with no 320px specs.
- **EventTypePanel**: Simple / Dinner & Festival select, plus module toggles (switches with one-line help). Panels show only when their module is on. Switching back to Simple hides the panels but keeps the content.
- **CoursesPanel**: tabs for Adult menu / Kids' menu (the second tab only when `kids_menu` is on). Each course is a card with a name, up/down reorder and delete. Options are rows with label, description, dietary tag chips (from the event's dietary choices plus free text), an active toggle and reorder.
- **CataloguePanel**: categories as cards. Each item row has name, unit note, price (£ input stored as pence), Drink/Voucher, optional max per booking, active and reorder.
- **PaymentSchedulePanel**: Full only / Full or deposit. The deposit percent has a "One third" preset button (33.334, shown as "one third, rounded up"). Balance due date. A live worked example on a sample order uses the stage 1 `eventPricing` module.
- **FeeCoverPanel**: an on/off switch that shows the three shared rates as read-only text.
- **InfoBlocksPanel**: block cards with kind, title, body textarea, kind-specific fields (hotel: code, rate, phone, link, book-by), image upload with preview, alt text (required when there is an image), visible and reorder. A "Preview" button renders the block as the public card will look.
- **SeoPanel**: SEO title and description with character counters (70/170) and an OG image (upload or URL), falling back to the public title and tagline.
- Data hooks: one `useEventModules(eventId)` loader plus small save helpers. Reorder writes `sort_order` in batches. Loading uses `useInitialLoading`.

## Duplicate Event
In `src/lib/eventDuplicate.ts`:
- `COPY_FIELDS` gains `event_type, modules, payment_mode, deposit_percent, fee_cover_enabled, seo_title, seo_description, og_image_url`.
- `balance_due_date` is rolled with `addOneYear` (null stays null). `seo_title` gets `bumpYear`.
- A new pure `buildDuplicateChildren(src, newEventId)` returns new rows for courses → options and categories → items, mapping old ids to new ones, and info blocks. It strips ids and timestamps and keeps the same image paths (shared files, never deleted on duplicate).
- The admin inserts parents first, then children. If a child insert fails, the new draft event is deleted so the copy is all-or-nothing.
- It never copies bookings, guests, payments, tokens, ledger rows, `is_public`, `archived_at`, deadline or short link. Those are unchanged by this stage.

## Back-to-top fix
`ScrollToTopButton` returns null when the path matches `/events/<slug>` (the confirmation page included). Other pages are unchanged.

## Phone number
No change in this stage. It is recorded as a rule (optional on every public booking form) and asserted in stage 3 tests.

## Tests
- Unit: duplicate copies the module fields and rolls `balance_due_date`; `buildDuplicateChildren` remaps course/option and category/item ids, preserves order, and never carries ids, tokens or payments; the modules parser defaults; the one-third preset maths through `eventPricing`; pence/£ input conversion.
- Database checks (SQL as anon, ordinary member, Treasurer, Secretary, admin), each wrapped in a rolled-back transaction:
  - anon sees content only for a published event, never for a draft or archived one, and never inactive or hidden rows;
  - an ordinary member can't write;
  - the Treasurer can read but not write;
  - Admin and the current Secretary can write;
  - the cross-event option trigger rejects mismatches;
  - the payment schedule trigger rejects deposit mode without a percent or due date;
  - storage upload is denied to an ordinary member.
- Regression: the existing full suite and `public-events-duplicate-qr` / calendar browser specs; the Christmas page loads and its booking form opens unchanged (390px screenshot); a back-to-top check on `/events/christmas-party-2026`.

## What could break existing events
- New `event_accounts` columns have defaults and the view is unchanged, so public pages and checkout are unaffected.
- The new triggers fire on event updates. The schedule trigger only acts in deposit mode, so it does nothing for existing events.
- Duplicate becomes several inserts. A failure path cleans up the draft.
- Existing `event-images` policies are untouched.

## Questions
1. Image bucket: create a new **public-read** `event-content-images` bucket (public pages need images without sign-in), or reuse the private `event-images` bucket through signed links? I recommend the new public bucket.
2. Read access for content: mirror today's `event_accounts` readers (Treasurer, Auditors, WM, plus Admin/Secretary)? Or Treasurer only plus editors, as your brief literally says?
3. Kids' menu: separate courses (the plan above), or the same courses with child-only options?
4. Is a per-item "max per booking" useful, or should I drop it?
