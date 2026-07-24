
## 1. Schema (single migration)

- New `public.venues` (id, name, dining_capacity int, address text nullable, timestamps). RLS: public read; admin/secretary write. GRANTs to anon/authenticated/service_role.
- `lodge_events`: add `venue_id uuid null references venues(id)`.
- `bookings`: extend `payment_status` allowed values to include `waitlisted` and `waitlisted_refunded` (no CHECK constraint — enforced in app + trigger).
  - Drop/recreate the partial unique index on `(meeting_id, lower(email), payment_status)` to also cover `waitlisted` / `waitlisted_refunded` so a person can't accidentally hold multiple waitlist rows for the same meeting.
- Seed one venue "Guildford Masonic Centre", capacity 120, and set `lodge_events.venue_id` for all existing rows.
- New SQL function `public.check_and_book_seats(_event_key text, _meeting_id uuid, _seats int) returns text` — takes an advisory lock keyed on `hashtext(event_key||meeting_id)`, counts occupied seats (sum of `seatsToCharge` across bookings with `payment_status in ('confirmed','paid')` for that event/meeting), compares to `venues.dining_capacity` via the event's venue, and returns `'confirmed'` if the requested seats fit or `'waitlisted'` if not. Returns `'confirmed'` unconditionally when the event has no venue_id (unlimited). SECURITY DEFINER, called from both edge functions inside the same transaction as the insert.
- New SQL function `public.promote_next_waitlisted(_meeting_id uuid, _freed_seats int) returns uuid` — under advisory lock, finds the earliest-created still-`waitlisted` booking whose `seatsToCharge <= _freed_seats`, flips it to `confirmed`, returns its id (or null). Called by trigger + admin action + refund job.
- New trigger on `bookings AFTER UPDATE OF payment_status`: when a row moves from `confirmed`/`paid` → `apologies`/`cancelled` (or is deleted), call `promote_next_waitlisted` and record the promoted id in `pg_notify` payload so the edge function can send an email (see §4).

## 2. Server-side capacity enforcement

- `supabase/functions/save-meeting-response/index.ts`: before insert, resolve `seatsToCharge` from details (1 + guestCount when option = meeting-and-festive-board, else 0). If `seatsToCharge > 0`, call `check_and_book_seats` RPC; use its result as `payment_status` (either `confirmed` or `waitlisted`). Apologies/meeting-only still go straight to `confirmed`/`apologies` as today.
- `supabase/functions/create-checkout/index.ts`: same pattern — compute seats from line_items / details, call the RPC, and stamp the booking row with `confirmed` (will become `paid` on webhook) or `waitlisted`. Payment flow is unchanged: Stripe embedded checkout still runs and captures full amount.
- `payments-webhook`: when `checkout.session.completed` fires, keep the existing "mark paid" behaviour but preserve `waitlisted` status — i.e. if row is `waitlisted`, set a new `waitlisted_paid_at` timestamp (reuse `paid_at` + keep status `waitlisted`) and store `stripe_payment_intent_id` so we can refund later.

## 3. Auto-promotion

- The DB trigger handles the common path (Secretary edits a row to apologies, or public form resubmission cancels). Trigger uses `pg_net` to POST to a new lightweight edge function `notify-waitlist-promoted` with the promoted booking id, which sends the reused `booking-confirmation` email with a short "a place has opened up" preface (new `promoted: true` prop on the existing template, gated so no other callers change).
- Admin "Promote now" button in `FestiveBoardRegister.tsx` calls a new RPC `promote_waitlisted_by_id(_booking_id uuid)` that flips status + returns the row, then the client invokes `notify-waitlist-promoted` for the email.

## 4. Auto-refund if never promoted

- New edge function `waitlist-refund-sweep` (verify_jwt = false, service role): finds meetings whose `meeting_date < today` OR `status = 'completed'` that still have `waitlisted` bookings with a `stripe_payment_intent_id`. For each, `stripe.refunds.create({ payment_intent })`, update status → `waitlisted_refunded`, invoke `send-transactional-email` with a new template `waitlist-refunded` explaining the seat didn't open and the full refund is issued.
- Scheduled via `pg_cron` daily at 07:00 UK (same hourly-guard pattern used in `almoner-overdue-check`).

## 5. Admin UI (`FestiveBoardRegister.tsx`)

- New "Waitlist" collapsible section per meeting: lists `bookings` where `payment_status = 'waitlisted'` for that meeting, ordered by `created_at` ASC, showing name/email/seats/created date/paid status. Each row has a "Promote now" button (calls new RPC + email invoke) and shows a badge if already `waitlisted_refunded`.
- Small capacity indicator at the top of each meeting card: `X / capacity seats booked`.

## 6. Email templates

- New `waitlist-refunded` template (internal-style single-purpose apology + refund confirmation). Registered in `_shared/transactional-email-templates/registry.ts`.
- Extend `booking-confirmation` to accept an optional `promoted?: boolean` prop that adds a one-line "Good news — a place has opened up and you've been moved from the waitlist to confirmed." at the top. All existing invocations continue to work (prop is optional).

## 7. Frontend booking form messaging

- No change during checkout per spec — user pays the same way. Only the post-payment confirmation screen (`CheckoutReturn.tsx`) checks the resulting booking's `payment_status`: if `waitlisted`, shows "You're on the waitlist — your payment is held and will be automatically refunded in full if a place doesn't open up before the event." Otherwise unchanged.

## 8. Rollout / what you need to confirm

- Stripe refund permissions: the existing `STRIPE_LIVE_API_KEY` / `STRIPE_SANDBOX_API_KEY` gateway keys already permit refunds via `stripe.refunds.create` on the same payment intent — nothing extra to configure.
- Confirm capacity of 120 for Guildford Masonic Centre (spec says 120).
- Confirm the "cancelled" path — I'll treat both `payment_status = 'apologies'` and hard-deleted rows as freeing seats.

## Technical notes

```text
bookings row lifecycle
  create → check_and_book_seats → 'confirmed' | 'waitlisted'
  stripe pays → webhook keeps 'waitlisted' or promotes to 'paid'
  confirmed→apologies (trigger) → promote_next_waitlisted
  sweep(after event) → refund + 'waitlisted_refunded'
```

Files touched:
- migration (new)
- `supabase/functions/save-meeting-response/index.ts`
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/payments-webhook/index.ts`
- new `supabase/functions/notify-waitlist-promoted/index.ts`
- new `supabase/functions/waitlist-refund-sweep/index.ts`
- new `waitlist-refunded.tsx` template + updated `booking-confirmation.tsx` + registry
- `src/pages/members/FestiveBoardRegister.tsx` (waitlist section + capacity indicator)
- `src/pages/CheckoutReturn.tsx` (waitlist messaging)
- `pg_cron` schedule for the sweep (via supabase--insert, not migration, per project rules)
