# Event Accounts as a proper subledger (funds held for others)

## What I confirmed today
- **Budget vs Actual £0:** actuals come only from `journal_lines` tagged with the event, matched to budget lines by name. Online bookings create no journal lines (Christmas Party has 0 tagged lines), so "Ticket sales" (planned £4,000) shows £0.
- **Reconciliation card:** "Recorded as received" adds up paid bookings; "Landed in Bank (1000)" adds up only 1000 lines tagged to the event (none), so the gap equals everything received.
- **Card label is wrong:** the card currently says fee contributions are "4120 Fee Cover Income". That is lodge wording and will be removed.
- **Chart of accounts already has** 1000 Bank, 1010 Stripe Suspense, 2300 Funds Held on Behalf of Others, 4900 Other Income and 5410 Bank Charges. **No new accounts are needed.**
- **Christmas Party data:** one budget line ("Ticket sales", income, £4,000) and one booking, XMAS26-0003 (bank transfer, paid, £40 total, fee £0, no subtotal stored because it predates the fee change). The earlier test bookings are no longer there.
- The lodge `stripe_payouts` table stores payout id, amount, currency, arrival date, status, env and journal entry. Its webhook posts Dr 1000 / Cr 1010. The events webhook ignores payouts at the moment.

## Design

### 1. Fixed budget lines
- Every event gets three system lines: Income "Ticket sales", Income "Fee contributions", Cost "Stripe fees". A database trigger creates them when an event is created, and a backfill adds them to existing events.
- They are marked with a new `system_key` column (`ticket_sales`, `fee_contributions`, `stripe_fees`). A database guard blocks deleting or renaming them; only the planned amount can change. The screen hides Delete and Rename for these lines.
- **The existing "Ticket sales" line becomes the fixed line:** the backfill tags any existing income line called exactly "Ticket sales" with `ticket_sales`, keeping its id and its £4,000 plan. It only creates a new line where none exists.
- Planned ticket sales: if the plan is still 0, a "Use expected attendees × adult price" button fills it in (capacity, or a typed attendee count). The plan stays editable and is never overwritten automatically.
- Lines the Treasurer adds (catering, band, singer) work as they do now.

### 2. Income actuals from bookings
- Ticket sales actual = total `subtotal_pence` of paid bookings. Fee contributions actual = total `fee_pence`. For older rows with no subtotal, it falls back to total minus fee, which covers XMAS26-0003.
- Online bookings post nothing to 4100, 4120 or any other lodge income account, now or later.
- Lines the Treasurer adds keep using tagged ledger lines (vendor payments Dr 2300 / Cr 1000).

### 3. Real Stripe fees
- New columns on `event_bookings`: `stripe_fee_pence`, `stripe_net_pence`, `stripe_balance_transaction_id`. This mirrors what lodge `bookings` already does.
- When a booking is marked paid, the events webhook reads the charge's balance transaction using the events key only, with the same "try twice, about 3 seconds apart, never fail" pattern as the lodge.
- A Treasurer-only "Refresh Stripe fees" button fills in any paid card or Pay by Bank booking still missing a fee.
- "Stripe fees" actual = total `stripe_fee_pence`. Bank transfers into Stripe can also carry a fee, and that is captured the same way.

### 4. Events payouts
- New table `event_stripe_payouts` (payout id, amount, currency, arrival date, status, created). It is separate from the lodge's `stripe_payouts`, so lodge payouts and lodge ledger posting are untouched.
- A new allocation table `event_payout_allocations` (payout, event, amount) lets one payout be split across several events. The screen shows how much of each payout is still unallocated.
- The events webhook handles `payout.paid` and records the payout only, with no automatic journal posting. If there is exactly one event with unpaid-out bookings, it suggests an allocation; otherwise the Treasurer allocates it on the event page.
- **Bank side:** the Treasurer tags the matching Lloyds credit to the event as Dr 1000 / Cr 2300, using the existing Transaction Detail tagging. Vendor payments are tagged Dr 2300 / Cr 1000, as now. The card shows payouts and their allocation next to the tagged Lloyds lines, so each payout can be ticked off against its bank line.
- **Action for you:** add `payout.paid` to the events webhook endpoint in the events Stripe dashboard. Its subscribed events are not set from here.

### 5. Still in Stripe
- A new Treasurer-only function, `events-stripe-balance`, reads the events account's available and pending GBP balance using `STRIPE_EVENTS_SECRET_KEY`. It is shown on the event page with a "checked at" time.
- This balance covers the whole account, not one event. The card uses "this event's share" = received − Stripe fees − payouts allocated to this event, and shows the account-wide balance as a cross-check.

### 6. Tie-out on the reconciliation card
```text
Received from online bookings (subtotal + fee)
 − Stripe fees (actual)
 − Landed in Lloyds tagged to event (1000 debits, Cr 2300)
 − Still in Stripe for this event (net − payouts allocated)
 = 0, otherwise shown as an explained gap
```
- Each gap is explained, for example "payout not yet tagged in Lloyds", "Stripe fee not yet fetched", or "payout unallocated".
- **Cash/cheque bookings** are a separate block. When the Treasurer marks one paid, it posts Dr 1000 / Cr 2300 tagged to the event, with a period picked by the entry date.
- **Surplus:** a later "Reclassify retained surplus" action posts Dr 2300 / Cr 4900, tagged to the event. That is the only route into lodge income. Charity payments out are Dr 2300 / Cr 1000.

## Technical details
- **Migration (one, additive only):**
  - `event_budget_lines.system_key` (nullable), plus a unique index on (event, system_key).
  - A trigger that seeds the lines on new events, a backfill for existing events, and a guard blocking delete or rename of system lines.
  - `event_bookings` gains `stripe_fee_pence`, `stripe_net_pence` and `stripe_balance_transaction_id`.
  - New `event_stripe_payouts` and `event_payout_allocations` tables, readable and writable only by whoever can already view or edit Event Accounts (same helper as today). Service role gets write access for the webhook. Grants and RLS follow the project rules.
- **Edge functions:**
  - `stripe-events-webhook`: add fee capture and `payout.paid`.
  - New `events-stripe-balance` and `events-backfill-fees` (Treasurer-checked, events key only).
  - Additions to `_shared/stripe-events.ts`.
- **Front end:** `EventAccountsTab.tsx` (fixed lines, booking-driven actuals, payouts and allocation, tie-out, cash posting via the existing posting-period helpers, surplus reclassify). A pure `src/lib/treasurer/eventTieOut.ts` holds the calculation.
- **Not touched:** `Bookings.tsx`, `create-checkout`, `payments-webhook`, lodge `bookings`/`stripe_payouts`, dues, 4100/4120 posting, `_shared/stripe.ts`.
- **Existing data:**
  - The Christmas "Ticket sales" line is tagged in place, and two lines are added.
  - XMAS26-0003 starts counting £40 of ticket sales. Its Stripe fee is fetched by the refresh button (bank transfer, so the fee may be 0 or small).
  - No journal entries are created or changed.

## Testing
- Unit tests:
  - Tie-out equals 0 for a balanced case.
  - Each gap reason triggers correctly.
  - Payout allocation cannot exceed the payout.
  - Old rows with no subtotal fall back correctly.
  - Ticket sales and fee contributions come from bookings and never from 4100/4120.
- Database checks run as Treasurer, Secretary and an ordinary member:
  - System lines can't be deleted or renamed.
  - Payout tables are hidden from members.
  - Ordinary lines can still be edited.
- The webhook is checked with signed sample `payout.paid` and paid events in test mode, with no real booking.
- The full test suite, plus a 320px check of the Event Accounts card.
- Lodge regression: the existing lodge webhook and dining tests pass unchanged.

## Risks
- The lodge's behaviour is unaffected because the work uses separate tables, functions and Stripe keys.
- **Main risk:** double counting, if a Treasurer also hand-posts online booking income to 2300. The card will flag 2300 credits tagged to the event that aren't from Lloyds payouts or cash bookings.
- Older bookings may lack a fee until it is fetched; the tie-out shows this.

## Questions
1. Cash/cheque: post automatically when "Mark paid" is clicked (Dr 1000 / Cr 2300), or only record it and let you tag the Lloyds line yourself? Doing both would double count, so I'd post automatically and skip the bank tag for those.
2. Planned ticket sales: use capacity or a separate "expected attendees" figure (new field) for the default?
3. Should "Stripe fees" also include Stripe's refund fees and dispute fees, if any happen?
4. Reclassifying the surplus to 4900: include it now, or leave it for later?
