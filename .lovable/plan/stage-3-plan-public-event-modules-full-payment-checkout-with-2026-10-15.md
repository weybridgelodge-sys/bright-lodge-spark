# Stage 3 plan: public event modules + full-payment checkout with line items

Plan only. Nothing runs until you approve. Simple events (Christmas party) must look and behave exactly as today.

## What I checked in the code first
- `public_events` view (last defined in migration 0088) has no Stage 2 columns yet: no event_type, modules, payment_mode, fee_cover_enabled, SEO fields. `PublicEvent.tsx` reads only this view through `fetchPublicEvent()`.
- Stage 2 content tables (courses, course options, catalogue categories/items, info blocks) already have published-only public read policies through `is_event_published()`. So the public page can read them directly. No new public view is needed for them.
- `modules` holds `courses, kids_menu, catalogue, deposit, info_blocks, sections{menu,drinks,info,hosting_lodges,highlights}`. There is **no "decide later" setting yet**. I propose adding `modules.courses_decide_later` (boolean, off by default). This changes the settings data only, not the database structure.
- `create-event-checkout` works out prices on the server from adult/child prices with `quoteBooking(plan:"full")`. It ignores client totals, but it does not honour `fee_cover_enabled`. Stripe gets adult, child and fee lines.
- `event_bookings` has no `payment_plan` column. `event_guests.menu_choice` and `wine_preorder` exist as text.
- SEO: `SEO.tsx` sets meta tags in the browser only, using react-helmet. There is no prerender step. `prebuild` only generates the sitemap and RSS. So right now social crawlers that don't run JavaScript see the generic tags from `index.html` for every `/events/:slug`.
- `event-header-image` returns a short-lived signed link for meeting header images. It is not suitable for og:image.

## Stage 3a: schema (one additive migration)

```sql
-- 1. Public view: append new columns at the end (CREATE OR REPLACE requires existing order unchanged).
CREATE OR REPLACE VIEW public.public_events AS
SELECT id, slug, COALESCE(public_title, name) AS public_title, name, tagline, intro_copy, theme, event_date, start_time, end_time, venue,
  booking_deadline, capacity, adult_price_pence, child_price_pence, hosting_lodges, highlights, dress_code,
  (SELECT COALESCE(sum(b.adult_count + b.child_count), 0)::integer FROM public.event_bookings b
    WHERE b.event_id = e.id AND b.source = 'public'
      AND public.event_booking_holds_seat(b.payment_status, b.payment_method, b.created_at)) AS seats_taken,
  useful_stuff, menu_items, dietary_choices,
  event_type, modules, payment_mode, deposit_percent, balance_due_date, fee_cover_enabled,
  seo_title, seo_description, og_image_url
FROM public.event_accounts e
WHERE is_public = true AND slug IS NOT NULL AND archived_at IS NULL;
GRANT SELECT ON public.public_events TO anon, authenticated;

-- 2. Minimal booking columns (defaults keep every existing row valid and unchanged in meaning).
ALTER TABLE public.event_bookings
  ADD COLUMN IF NOT EXISTS payment_plan text NOT NULL DEFAULT 'full'
    CHECK (payment_plan IN ('full','deposit')),
  ADD COLUMN IF NOT EXISTS tickets_subtotal_pence integer CHECK (tickets_subtotal_pence IS NULL OR tickets_subtotal_pence >= 0),
  ADD COLUMN IF NOT EXISTS items_subtotal_pence integer NOT NULL DEFAULT 0 CHECK (items_subtotal_pence >= 0);

-- 3. Drinks/vouchers per booking, with name and price snapshots.
CREATE TABLE public.event_booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.event_accounts(id) ON DELETE CASCADE,
  catalogue_item_id uuid REFERENCES public.event_catalogue_items(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('drink','voucher')),
  category_name text,
  name_snapshot text NOT NULL,
  unit_note_snapshot text,
  unit_price_pence integer NOT NULL CHECK (unit_price_pence >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total_pence integer GENERATED ALWAYS AS (unit_price_pence * quantity) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_booking_items_booking_idx ON public.event_booking_items(booking_id);
CREATE INDEX event_booking_items_event_idx ON public.event_booking_items(event_id);

-- 4. Per-guest course choices ("decide later" = option_id NULL + decide_later true).
CREATE TABLE public.event_guest_course_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES public.event_guests(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.event_accounts(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.event_courses(id) ON DELETE SET NULL,
  option_id uuid REFERENCES public.event_course_options(id) ON DELETE SET NULL,
  course_name_snapshot text NOT NULL,
  option_label_snapshot text,
  decide_later boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (decide_later OR option_id IS NOT NULL OR option_label_snapshot IS NOT NULL),
  UNIQUE (guest_id, course_id)
);
CREATE INDEX event_guest_course_choices_booking_idx ON public.event_guest_course_choices(booking_id);
CREATE INDEX event_guest_course_choices_event_idx ON public.event_guest_course_choices(event_id);

-- Grants: no anon access (the checkout function writes with the service role; public confirmation reads via get-event-booking).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_booking_items, public.event_guest_course_choices TO authenticated;
GRANT ALL ON public.event_booking_items, public.event_guest_course_choices TO service_role;

ALTER TABLE public.event_booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_guest_course_choices ENABLE ROW LEVEL SECURITY;

-- Same readers/writers as Stage 2 content (Admin, Secretary, Treasurer, Auditors, current WM read; Admin/Treasurer/Secretary write).
CREATE POLICY "Event staff read booking items" ON public.event_booking_items FOR SELECT TO authenticated
  USING (public.can_read_event_content(auth.uid()));
CREATE POLICY "Event staff write booking items" ON public.event_booking_items FOR ALL TO authenticated
  USING (public.can_write_event_content(auth.uid())) WITH CHECK (public.can_write_event_content(auth.uid()));
CREATE POLICY "Event staff read course choices" ON public.event_guest_course_choices FOR SELECT TO authenticated
  USING (public.can_read_event_content(auth.uid()));
CREATE POLICY "Event staff write course choices" ON public.event_guest_course_choices FOR ALL TO authenticated
  USING (public.can_write_event_content(auth.uid())) WITH CHECK (public.can_write_event_content(auth.uid()));

-- Child rows must belong to the same event as their booking (reuse the Stage 2 pattern).
CREATE OR REPLACE FUNCTION public.event_booking_child_match() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.event_bookings b WHERE b.id = NEW.booking_id AND b.event_id = NEW.event_id) THEN
    RAISE EXCEPTION 'Booking does not belong to this event';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER event_booking_items_match BEFORE INSERT OR UPDATE ON public.event_booking_items
  FOR EACH ROW EXECUTE FUNCTION public.event_booking_child_match();
CREATE TRIGGER event_guest_course_choices_match BEFORE INSERT OR UPDATE ON public.event_guest_course_choices
  FOR EACH ROW EXECUTE FUNCTION public.event_booking_child_match();
```
Existing Christmas bookings: `payment_plan` becomes 'full', `items_subtotal_pence` becomes 0 and `tickets_subtotal_pence` stays NULL. The app treats NULL as "equal to subtotal". No backfill and no change to their amounts.

## Stage 3b: server pricing and checkout
- Extend `_shared/eventPricing.ts` with a pure `priceDinnerOrder(config, request)`. It validates:
  - ticket counts
  - each guest has exactly one active option per course in their menu set: adult courses for adults, child courses for children when kids' menu is on; children get adult courses when it is off
  - "decide later" allowed only when `modules.courses_decide_later` is on
  - catalogue items exist, are active, belong to this event, quantity is a whole number and no more than `max_per_booking`, and the catalogue module is on
  - the fee is applied only when `fee_cover_enabled` is on and the guest chose to cover it
  It returns ticket subtotal, items subtotal, order total, fee, total and Stripe lines.
- `create-event-checkout`: the body adds optional `items[{item_id, qty}]` and `guests[].courses[{course_id, option_id|null, decide_later}]`. The server reloads courses, options and catalogue from the database and ignores any client price or label. Client totals are not accepted at all; any extra field is stripped by the schema. `payment_plan` is fixed to 'full'.
- It inserts the booking, then guests, then course choices and items, using snapshots. It fills `event_guests.menu_choice` with a readable summary, e.g. "Starter: Soup; Main: Beef (decide later: Dessert)". If a later insert fails, it deletes the booking so no half booking holds seats.
- Stripe lines: one per ticket type, then one per drink/voucher (`<Accounts name> — <item>`, qty, unit price), then one fee line. For bank transfer, a single PaymentIntent covers the full total and the metadata gains `items_pence`.
- Simple events: the same code path produces identical lines and amounts. This is covered by a test comparing to today's output. `fee_cover_enabled=false` forces fee 0. Christmas is true by default, so it is unchanged.
- Webhook: no logic change. It already checks paid amount equals subtotal plus fee, and subtotal will now include items. Event Accounts actuals use paid booking subtotal for "Ticket sales". **Decision needed (Q2):** count drinks inside Ticket sales, or show them as a separate read-only "Pre-orders" figure in the booking detail only. Treasurer booking detail lists items and course choices, read-only.
- `get-event-booking`, the confirmation page and the customer/lodge emails list items and course choices, with "decide later" marked.

## Stage 3c: public page modules (`PublicEvent.tsx` + new `components/events/booking/` pieces)
- `CourseSelects`: one select per course per guest, inside the existing guest row. It uses the kids' set for child rows. "Decide later" is shown only if enabled. Selects are full width and 48px tall.
- `CatalogueStepper`: items grouped by category, reusing `Stepper`, with a running subtotal. Vouchers appear as their own group.
- `InfoBlocks`: cards with serif headings, body text with `whitespace-pre-line`, optional image and an https link opening in a new tab.
- `FeeAndSummary` gains optional item and ticket lines. It is hidden when fee cover is off.
- Sections are shown or hidden from `modules.sections`. When `event_type='simple'` every new piece renders nothing and no extra data is fetched. The phone number stays optional, with a test asserting this on both form types.

## Stage 3d: SEO, sharing image and crawlers
- Meta from data: title = `seo_title` or public title; description = `seo_description` or the current generated sentence; image = permanent image URL, then site default. JSON-LD Event uses venue from data with the current Guildford address as fallback only when the venue is default. It includes `image`, an AggregateOffer price range (adult/child lowest, adult highest) and organiser from hosting lodges, all built by one pure `buildEventSeo(ev)` with tests.
- **Permanent image URL**: new public function `event-image`, e.g. `/functions/v1/event-image/<slug>/og` or `/<slug>/<block-id>`, no login. It checks the event is published, not archived, and the image path is in that event's folder. It streams the file bytes (no redirect, since some crawlers don't follow redirects to signed links) with `Content-Type` and `Cache-Control: public, max-age=3600, s-maxage=86400`, and returns 404 otherwise. `og_image_url` stores a storage path, or an external https URL used as-is.
- Info-block images on the page also use this function. Recommended: one code path, cacheable, no expiring links in the page.
- **Crawlers**: proposed minimum is a `postbuild` step. After `vite build`, for each published event, copy `dist/index.html` to `dist/events/<slug>/index.html` with title, description, canonical, og:* and twitter tags and JSON-LD replaced. React then takes over normally.
  - Limits: tags refresh only when the site is next published, same as the sitemap today. **This depends on hosting serving that file before the SPA fallback, which I have not verified.** It is the first task of 3d. If hosting ignores it, the fallback is a `/functions/v1/event-share/<slug>` share link with full OG tags that sends people on to the event page, used for the QR code and social posts.

## Tests
- Unit: tampered totals and labels ignored; inactive, wrong-event or unknown item rejected; quantity over `max_per_booking` rejected; missing or extra course choice rejected; child using adult course when kids' menu on rejected; "decide later" only when enabled; fee on/off; simple-event line items byte-identical to today; `buildEventSeo` output; phone optional.
- Rolled-back database checks: anon cannot read or write the new tables; member cannot read; Treasurer/Secretary/Admin can read; event-mismatch trigger blocks cross-event rows.
- Browser: Christmas page markup and booking request before/after identical, and form at 320/390px with no overflow. Festival 2027 draft is previewed via a temporary published copy in a rolled-back state or a local mock, never by flipping `is_public` on real data. Courses, steppers and info cards are checked at 320/390px.
- Image function: published returns 200 with the image and cache headers; draft, archived or wrong-folder returns 404; curl without JS fetches it.
- Stripe test-mode run on the hidden Ladies Festival 2027 draft: **written out for your approval, not run.** Temporarily enable test keys? No: the events keys are now live. **Q3 below.**

## What could break existing events
- View redefinition: columns are only appended. The website calendar, portal feed and sitemap select named or `*` columns and tolerate extras.
- Checkout refactor for Christmas: guarded by the identical-output test.
- `fee_cover_enabled` is now honoured: Christmas is true, so no change.
- The postbuild step adds files only. If wrong, it could show stale tags until the next publish.

## Not touched
`/ladies-festival`, `/ladies-night`, `LadiesFestival.tsx`, `LadiesFestivalTemplate.tsx`, old `bookings` table, lodge Stripe. No deposits, balance links, reminders, Treasurer balances or PerfectTablePlan export.

## Questions
1. "Decide later": OK to store the on/off switch in the event's module settings (admin toggle beside Courses)?
2. Should drinks/voucher income count inside Event Accounts "Ticket sales" actual, or have its own fixed line "Pre-orders" (a new system budget line on festival events only)?
3. The events Stripe keys are now live. For the Stripe test-mode run, will you add test keys temporarily, or should I add separate `STRIPE_EVENTS_TEST_*` secrets used only when the draft is flagged for testing?
4. OK to verify whether hosting serves per-event HTML files, falling back to the share link if not?
