# Public events system — starting with the Joint Christmas Party

## What you will get
- `/events` keeps its current calendar and gains an "Upcoming events" card list, each card linking to its own page.
- `/events/christmas-party-2026` (and any future slug): hero, highlights, pricing, booking form, closing CTAs — all driven by the event row in Treasurer > Event Accounts.
- `/ladies-night` and `/ladies-festival` stay exactly as they are.
- Christmas theme: navy hero with soft CSS snowfall (off under reduced motion), gold holly/star dividers, existing tokens only.
- "Events" added to the main nav and footer.

## Data (extends the existing Event Accounts record — no second events table)
- Add to `event_accounts`: slug (unique), public_title, tagline, intro_copy, theme (christmas|default), start_time, end_time, venue, booking_deadline, capacity, adult_price_pence, child_price_pence, hosting_lodges (text[]), highlights (jsonb), dress_code, is_public (default false), reference_prefix, statement_descriptor (check ≤ 22 chars), events_notify_email. The existing `event_date` is reused.
- Extend `event_bookings` (already linked by event_id) with: reference, contact email/phone, lodge label, adult/child counts, total, payment_method (card|bank_transfer|pay_by_bank|manual), payment_status (pending|paid|cancelled), Stripe session/intent/customer ids, bank-transfer instructions, source = 'public'. Paid public bookings fill the existing deposit/balance "money in" columns, so they show in Event Accounts and stay out of the lodge operating ledger.
- Extend `event_guests` with age and is_child; dietary needs go in the existing allergies column.
- Public view `public_events` exposes only display fields for rows where is_public = true. Budget, accounts and guest data stay private (existing RLS untouched).
- Prefill Christmas Party 2026 exactly as specified; prices, times and dress code left empty; is_public false.

## Event Accounts dialogs
- "New event" and "Edit" dialogs get a "Public page" section with every field above (prices entered in pounds).
- Booking list per event gains reference, payment method/status and a "Mark paid" action (cash/cheque exceptions).

## Booking form (Bookings.tsx pattern)
- Booker name, email, phone, lodge label (Weybridge / Astolat / Other / Guest — label only, no portal access).
- Adult and child steppers with live total; per-guest name, age, dietary needs.
- Honeypot in a hidden container; capacity (children count) and deadline checks, server-side too; "Sold out" / "Booking closed" / "Booking opens soon" (while either price is empty) states.
- Payment: Card (Stripe Checkout, Apple Pay/Google Pay automatic), Pay by Bank, Bank transfer.
- Confirmation page `/events/:slug/confirmation` with reference, status, bank details if pending, link to /events.

## Payments — events Stripe account only
- New secrets: STRIPE_EVENTS_SECRET_KEY, STRIPE_EVENTS_PUBLISHABLE_KEY, STRIPE_EVENTS_WEBHOOK_SECRET (test-mode first). Existing lodge checkout, webhook and keys untouched.
- `create-event-checkout`: validates input, re-checks price/capacity/deadline, creates the booking + reference (prefix + sequence, e.g. XMAS26-0001), then either a Checkout Session (card / pay_by_bank) or a Stripe Customer + PaymentIntent with customer_balance / gb_bank_transfer, returning the sort code, account number and reference Stripe provides. Line item and description use the event title from the record; metadata event_id, event_slug, booking_id, booking_reference on session and PaymentIntent; statement descriptor suffix from the record.
- `stripe-events-webhook`: verifies with the events secret; marks bookings paid on checkout completed / payment_intent succeeded; idempotent.
- No Lloyds details anywhere.

## Emails (existing email setup, navy/gold)
- Customer: booking confirmation (with bank details if pending) and payment-received.
- Lodge: new-booking and payment-received notifications to events_notify_email, defaulting to the current Treasurer and Secretary portal emails, with a link to the booking in Event Accounts.

## SEO
- Per-event title/description/og tags, Event JSON-LD (Guildford Masonic Centre, postalCode GU2 4DR, offers, organizers = both lodges); natural "Masonic Lodge in Surrey" / "Freemasons in Guildford" copy; sitemap entries for public events; one h1, h2 sections, article wrapper.

## Needs your input
- The three events Stripe test keys (secure form, after the functions exist), then the webhook URL to add in that Stripe account.
- Adult/child prices, start/end times, dress code, then switch is_public on.
- Bank transfer and Pay by Bank must be enabled in the events Stripe account settings.

## Technical notes
- The events account uses direct Stripe keys (user-supplied), deliberately separate from the Lovable-managed lodge payments.
- Tests: price total (adult × qty + child × qty), child age ≤ 12 rule, capacity includes children, booking disabled when a price is empty, descriptor ≤ 22 chars.
- 320px layout checks on the new public pages and the changed Event Accounts dialogs.
