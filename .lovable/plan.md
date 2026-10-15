# Dinner & Festival event type (data-driven, modular)

## What I checked in the code
- `LadiesFestival.tsx` (1,343 lines) and `LadiesFestivalTemplate.tsx` (1,344) hard-code: £75 ticket, `menuChoices` (starter/main/dessert), `wineOptions` + `beerOptions` (including a "Prepaid Drinks Voucher" at £10), deposit, venue map, charity copy and SEO text.
- Two corrections to your audit: the deposit is **one third** (`Math.round(total / 3)`), not 33%. And when someone pays a deposit, Stripe gets a single "33% deposit" line, with the full breakdown kept only in a `details` blob.
- `PublicEvent.tsx` is only 394 lines. Pulling a shared booking core out of it is practical.
- `stripe-events-webhook` already handles: checkout completed / async succeeded, `payment_intent.succeeded`, refunds, disputes and `payout.paid`. Processing fees already use one shared rule set (`_shared/cardFee.ts`).
- I found PerfectTablePlan-style export logic only in `FestiveBoardAdmin.tsx` (lodge meetings). Event Accounts has no guest export yet, so this plan treats it as new work.

## Principle
Everything about a specific event lives in its admin record. Code knows only *module types*. "Simple" events have every module turned off and behave exactly as they do today. Duplicate Event copies the module config and rolls dates forward.

## Data model (all additive, RLS = existing Admin/current Secretary edit, public read only when published, Treasurer read)
On `event_accounts` (new nullable/defaulted columns):
- `event_type text default 'simple'` (`simple` | `dinner_festival`)
- `modules jsonb default '{}'`: on/off flags for courses, drinks, deposit, fee_cover, info_blocks, plus section visibility
- `deposit_percent numeric null`, `balance_due_date date null`, `payment_mode text default 'full'` (`full` | `full_or_deposit`)
- `fee_cover_enabled boolean default true`. The existing shared fee rule stays the only formula, so there is no per-event percentage unless you want one (Q2).
- `seo_title`, `seo_description`, `og_image_url` (all nullable)

New tables, each linked to `event_accounts` with an ordering column:
- `event_courses` (name, sort) → `event_course_options` (label, dietary_tags text[], sort, active)
- `event_catalogue_categories` (name, sort) → `event_catalogue_items` (name, price_pence, unit_note, kind `drink` | `voucher`, active, sort)
- `event_info_blocks` (kind `hotel` | `charity` | `sponsor` | `dress` | `timings` | `custom`, title, body, structured jsonb such as hotel code/rate/phone, image_url, sort, visible)
- `event_guest_course_choices` (guest_id, course_id, option_id). The per-course menu choice for each guest.
- `event_booking_items` (booking_id, item_id, name_snapshot, unit_price_pence_snapshot, qty, line_total_pence). Snapshots keep historical bookings correct after later price edits.
- `event_booking_payments` (booking_id, kind `deposit` | `balance` | `full`, amount_pence, fee_pence, stripe_session_id, payment_intent_id, status, paid_at)

On `event_bookings` (new nullable/defaulted columns): `amount_due_total_pence`, `amount_paid_pence default 0`, `balance_due_pence default 0`, `balance_due_date`, `balance_token uuid` (single-use secure link), `payment_plan text default 'full'`.
`event_bookings` and `event_guests` stay the source of truth. The existing single `menu_choice` field stays filled with a readable summary, so current screens keep working.

## Pricing maths (one shared pure module, used by browser and server)
- items = tickets (adult/child) + catalogue lines
- deposit = round-up(items x deposit_percent)
- fee = the existing shared method-specific rule, applied to the amount being charged *now* (the deposit, the balance, or the full amount)
- The server recalculates everything from the database and ignores totals sent by the browser.

## Stripe / webhook flow
- Full payment: separate line items (tickets, each drink/voucher, fee). This uses the same metadata as today plus `payment_kind=full`.
- Deposit: one "Deposit (X% of £Y)" line + fee, with `payment_kind=deposit`. Full breakdown lives in `event_booking_items`, not a blob.
- Balance: a new public `create-event-balance-checkout` function is opened by `balance_token`. It charges `balance_due_pence` + fee, with `payment_kind=balance`. Card and Pay by Bank only, unless you want bank transfer too (Q4).
- Webhook: write or update the matching `event_booking_payments` row, increase `amount_paid_pence`, and recompute `balance_due_pence`. The status becomes `paid` only when the balance is 0, otherwise `deposit_paid`. The paid-amount check is now per payment, not per booking total.
- Refunds/disputes: the existing fee handling stays; `amount_paid_pence` is reduced by the refunded amount.
- Seat holds: the existing 30-minute hold for unpaid card bookings is unchanged. A paid deposit holds seats permanently.
- Balance reminder emails: a daily job sends at N days before `balance_due_date` (Q5), using the existing branded email setup.

## Admin UI (PublicEventsAdmin editor)
- An "Event type" selector. Choosing Dinner & Festival shows these module panels:
  - Courses & options: add, reorder, tag
  - Drinks & vouchers catalogue
  - Payment schedule
  - Fee cover toggle
  - Information blocks
  - Section visibility
  - SEO
- Duplicate Event also copies courses, options, catalogue and info blocks, and moves `balance_due_date` forward one year.
- The editor is split into module components so it doesn't grow into another 1,300-line file. Layout is 320px-first and uses existing tokens only.

## Public page
- Pull a shared booking core out of `PublicEvent.tsx`: lead booker, guest rows, honeypot, payment method, fee question, summary.
- Module components plug into it: per-guest course selects, a drinks stepper list with subtotal, a deposit/full choice with balance date, and info-block cards.
- Simple events render the core with no modules, giving the same markup and behaviour as today.
- JSON-LD Event schema and meta tags are built from event data (price range, dates, venue, image).

## Treasurer / export
- Event Accounts adds a "Balances outstanding" list (booking, paid, due, due date, copy/resend link). Fixed actual lines stay the same; ticket and catalogue income stay inside 2300 agency funds as today.
- New "Guest export (PerfectTablePlan CSV)" per event, with columns: name, booking ref, seating preference, one column per course, allergies/dietary, drinks summary, VIP, child/age.

## Stages (each can ship on its own)
1. Shared pricing/deposit module + tests; pull out the shared booking core with no visible change (existing event tests must pass).
2. Schema + admin modules (courses, catalogue, info blocks, payment schedule, SEO); Duplicate copies them.
3. Public page modules + JSON-LD; full-payment Stripe path with line items.
4. Deposit + balance link + webhook payment ledger + reminder emails + Treasurer balances.
5. PTP CSV export.
6. Seed 2027 Ladies Festival as a DRAFT by importing 2026 menu/drinks/copy (data insert only; the 2026 page and its bookings are untouched).
7. (Later, separate approval) cutover redirects.

## Tests
- Unit: deposit rounding, fee on deposit/balance/full for each method, zero subtotal, voucher lines, server rejecting tampered totals, balance status changes, refund reducing paid amount, Duplicate copying modules.
- Browser at 320/390px: simple event unchanged; festival form with guests, courses and drinks shows no sideways scrolling and keeps tap targets reachable; admin module panels.
- Stripe test mode end-to-end on the draft 2027 event: full card, deposit then balance link, bank transfer, refund. Run only after you approve each test booking.

## What could break existing events
- Pulling out the booking core could subtly change the Christmas form. This is guarded by keeping `event_type='simple'` the default and adding before/after browser checks.
- The webhook amount check changes from per booking to per payment. Existing bookings have a single "full" payment, so the change would be done with a backfill of `amount_paid_pence` in the same additive migration.
- Duplicating a 2026-style event must not copy `balance_token` or payments.

## Risks
- Hotel/charity details are free text, so officers can mistype them. Mitigated with preview in admin.
- Catalogue price edits after bookings exist are handled by the snapshot columns.
- Bank transfer + deposit adds reconciliation complexity.

## Decisions I need from you
1. Deposit: % rounded up (for example 33.34%), or keep "one third" as an option? Is the deposit taken on tickets only, or on drinks too?
2. Fee cover: keep the shared method rules (card 2%+20p, Pay by Bank 1%+20p, bank transfer 1%) with an on/off per event, or do you want an editable per-event percentage? An editable rate would break the shared one-rule principle.
3. Should drinks be allowed to change after booking (via the balance link), or are they fixed at booking?
4. Balance payment methods: card/Pay by Bank only, or bank transfer too?
5. Reminder timing for the balance (for example 14 and 3 days before), and what happens after the due date (flag only, or release seats)?
6. Should children get their own course options (a kids' menu), or the same courses?
7. Should course choices be required for every guest at booking, or allowed to be "decide later" with a reminder?
8. Should info-block images be uploaded to storage, or URL only?
