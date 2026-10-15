# Repeatable annual public events: Duplicate + Event QR

## 1. Duplicate event
- New "Duplicate" button on every event card (active and archived), Admin/current Secretary only, 48px target, sits in the existing 2-column phone grid.
- Creates a new `event_accounts` row copying only: public title, accounts name, tagline, intro, useful_stuff (parking, timings, access), dress code, menu items, dietary choices, highlights, adult/child prices, theme, hosting lodges, venue, capacity, start/end times, reference prefix, statement text, notification emails.
- Never copied: bookings, guests, payments, Stripe fees/payouts/allocations, budget or journal rows, archived state, public flag. New row is `is_public = false`, `archived_at = null`, `status = planning`, booking deadline cleared. Its own fixed budget lines are seeded by the existing trigger, as for any new event.
- Year handling (proposed): event date moved forward 1 year (same weekday not guaranteed, so flagged); any 4-digit year in title, accounts name, slug and reference prefix is bumped (2026 -> 2027, XMAS26 -> XMAS27); if no year present, " (copy)" is appended.
- Slug: bumped slug, then `-2`, `-3`... until unused across all event_accounts rows (including archived).
- Opens the editor on the new draft with a gold callout: "Duplicated from <title>. Check the date, times and prices before publishing." Publish rules unchanged.

## 2. Event QR
- "Event QR" button on published event cards and in the editor (when published with a slug).
- New optional "Short link" field in the editor (e.g. bit.ly). QR encodes the short link when set, else `https://weybridgelodge.org.uk/events/<slug>`. Validated as https URL.
- Client-side generation with the already-installed `qrcode` package (no paid service), error correction level M or Q.
- Dialog shows preview, the encoded URL, "Copy link" button, and two PNG downloads (1600px, 4-module quiet zone):
  - Navy QR on white.
  - White QR on navy with a gold border outside the quiet zone (inverted QR; quiet zone stays navy).
- Colours read from existing CSS tokens (navy, gold, white) only.
- Phone layout: dialog stacks at 320px; downloads via existing download helper (share sheet on touch).

## 3. Confirmed from code: what new events get automatically
- Public Event Calendar (/events): yes, `useEvents()` -> `fetchPublicEvents` reads `public_events`.
- Portal Calendar and webcal/ICS: yes, `member-calendar-feed` reads `public_events` (same feed for both).
- Event JSON-LD: yes, built per page in `PublicEvent.tsx` from the event row.
- Sitemap: partly manual. `scripts/generate-sitemap-and-feed.ts` reads `public_events` only at build time (`prebuild`), so a newly published event enters the sitemap only after the next publish of the site.
- Prerendered page title/description for `/events/<slug>`: to be checked during build; if generic, same "after next publish" caveat.

## Decisions needed
1. Event date on duplicate: move +1 year (proposed) or leave for you to set? (The date column requires a value, so "empty" would mean a placeholder.)
2. Copy start/end times too (proposed yes)?
3. Inverted (white-on-navy) QR: some older scanner apps struggle with inverted codes. Keep it, or do gold-bordered navy frame around a white QR panel instead (scans everywhere)?
4. Sitemap: accept "after next publish", or add a small live sitemap function later?

## Technical details
- Migration: add nullable `short_link text` to `event_accounts`; include in `public_events` view only if needed (not needed — QR is admin-side). No other schema change.
- `src/lib/publicEvents.ts`: pure `buildDuplicatePayload(row, existingSlugs)` and `bumpYear`, `uniqueSlug`, `eventQrTarget(row)`.
- `src/lib/eventQr.ts`: `renderEventQrPng(text, style)` using `qrcode` to canvas.
- `PublicEventsAdmin.tsx`: Duplicate button, QR dialog, Short link field, duplicate callout.
- Tests: duplicate payload excludes forbidden fields and is draft; slug uniqueness; year bump; QR target choice; both PNG styles decode back to the URL (decode with `jsqr` dev dependency, inverting for the navy style).
- 320px browser test for the card grid and QR dialog.
- Untouched: honeypot, events Stripe, /ladies-night, Bookings.tsx, real event data.
