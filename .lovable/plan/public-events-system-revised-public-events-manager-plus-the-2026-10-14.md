# Public events system (revised) — Public Events manager plus the Joint Christmas Party

## Already built (kept, adjusted below)
- Event Accounts record extended with the public fields. Christmas Party 2026 is filled in, with prices, times and dress code left empty and the event not public.
- Public `/events` list card, `/events/:slug` page with booking form, confirmation page, nav/footer "Events" link, sitemap entries.
- Separate events-account payment functions (card, Pay by Bank, bank transfer), webhook and emails. These wait for the three events Stripe keys.

## New: "Public Events" manager page
- New portal page at `/members/public-events`, built from the Meeting Events page: same layout, card style, archive dialog, Admin/Secretary permissions, and a tile next to "Meetings" in the Secretary Portal.
- Header, description line and a "New event" button.
- One card per event shows the title, date and time, and a DRAFT / PUBLISHED / ARCHIVED badge. Buttons: Edit, Publish/Unpublish, Archive/Restore, Delete, "Treasurer view". All are 44px+ and stack at phone width.
- The editor has the same sections as the meeting editor:
  - Basics: title, slug, tagline, intro.
  - The Useful Stuff: date, start/end time, venue, booking deadline, capacity, parking, dress code, timings, access.
  - Menu & dining: menu items (e.g. Hot buffet), plus optional dietary choices guests can pick in the booking form.
  - Highlights list.
  - Tickets: adult price, child price (12 and under).
  - Theme (christmas or default) and hosting lodges.
  - Advanced: booking reference prefix, card statement text (max 22 characters), notification emails.
- Publish only works once both prices and the start/end times are set. Otherwise the card explains what is missing.
- Archive hides the event from public pages but keeps every booking. Restore brings it back as a draft.
- Delete asks for confirmation. If the event has any bookings, Delete is blocked and Archive is offered instead.
- "New event" also creates the matching Event Accounts record. There is still one record per event and no second table.

## Event Accounts changes
- Remove the "Public page" section I added to the Edit and New event dialogs. Those dialogs go back to name, date and status, and notification emails move into the Public Events editor's Advanced section.
- Each event gets a "Public page" link that opens it in Public Events. Bookings, Mark paid, budget and accounts stay as they are.

## Public page
- `/events/:slug` shows the intro, The Useful Stuff, Menu & dining and Highlights sections from these fields. Dietary choices from the menu show up in each guest row, alongside a free-text dietary box.
- Archived or draft events are never shown publicly.

## Unchanged from the earlier brief
- Events Stripe account only: lodge checkout, webhook and keys are not touched.
- Bank transfer details come from Stripe, never hard-coded.
- Emails, SEO and Event JSON-LD (GU2 4DR), honeypot, existing colour tokens only, `/ladies-night` untouched.

## Needs your input
- The three events Stripe test keys, entered through the secure form after approval. Then you add the webhook address I give you in that Stripe account.
- Prices, start/end times and dress code. You set these in Public Events, then press Publish.
- The Treasurer's email. If no Treasurer is appointed in the portal, notifications go to the Secretary only.

## Technical details
- Migration: add `archived_at`, `useful_stuff` (jsonb: parking, dress, timings, access) and `menu_items` / `dietary_choices` (jsonb lists) to `event_accounts`. Update the `public_events` view to exclude archived rows. Add a security-definer `can_manage_public_events()` (admin or `is_lodge_secretary()`). Add update/insert policies so Secretary can edit through this page. Treasurer write access is unchanged.
- Add `dietary_choice` to `event_guests`.
- Delete check runs in the database: a trigger blocks deleting an event that has bookings.
- Tests: publish blocked without prices/times, delete blocked with bookings, archived events hidden from the public list. Plus the existing price/capacity/descriptor tests and a 320px browser check of the new page.
