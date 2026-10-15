# Stage 4 follow-up: record manual balance payments

## Findings (from code, no changes yet)
- **Secretary access today:** the Treasurer Portal (and its Event Accounts tab) is open to Admin, current Treasurer, Auditors 1/2, current WM/IPM and Secretary (role or current office). Secretary can read Event Accounts (bookings included) but cannot edit anything: database writes on bookings/budget lines are Admin/current Treasurer only, and the tab gets `canEdit = Admin || current Treasurer`.
- **Balances outstanding panel:** already visible to Secretary with **Copy link** and **Resend**; the `event-balance-link` function already allows Admin/current Secretary for get/resend and blocks regenerate. So no change is needed for item 2; Secretary will **not** see "Record balance received" or "Regenerate".
- **Gap found:** the tie-out splits online vs cash per *booking* (`payment_method`), so a card deposit + cash balance would be counted entirely as online. Fix: split by payment rows when a booking has ledger rows.
- `event_booking_payments.method` already allows `'manual'`; status/kind constraints already fit.

## Proposed migration (needs your approval: adds columns)
```sql
ALTER TABLE public.event_booking_payments
  ADD COLUMN IF NOT EXISTS manual_method text CHECK (manual_method IN ('cash','cheque','other')),
  ADD COLUMN IF NOT EXISTS note text CHECK (char_length(note) <= 500),
  ADD COLUMN IF NOT EXISTS reference text CHECK (char_length(reference) <= 100),
  ADD COLUMN IF NOT EXISTS recorded_by uuid,
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS event_booking_payments_request_uq
  ON public.event_booking_payments(request_id) WHERE request_id IS NOT NULL;
```
No new tables, no policy or grant changes (writes stay service-role only via the function; existing read policy unchanged). Audit = `recorded_by` + `recorded_at` on the immutable payment row, plus a function log line.

## Build
1. New function `event-record-balance` (Admin/current Treasurer via `isEventsTreasurer`): validates `booking_id`, `request_id` (uuid, generated once per dialog open), `amount_pence` > 0, `paid_at` (date, not future), `manual_method`, optional note/reference.
   - Re-reads booking; must be `deposit_paid` with balance > 0; rejects amount > `balance_due_pence`.
   - Inserts payment (kind `balance`, method `manual`, fee 0, status `paid`); duplicate `request_id` returns the existing result (double-click safe). Re-checks balance after insert; if a race overpaid, deletes its own row and rejects.
   - Calls shared `recomputeBooking` (same as webhook: `paid` only at zero).
2. Pure helper `validateManualBalance(balanceDue, amount)` in shared `eventPricing.ts` (browser + server).
3. Panel: "Record balance received" button (canRegenerate holders only) opening a small form: amount (prefilled with full balance, editable for partial), date, cash/cheque/other, reference, note. Button disabled while saving.
4. Tie-out/actuals: per-payment split so manual rows count in cash received / awaiting banking, still pro rata tickets vs pre-orders. Manual rows carry no Stripe fee.
5. Link/reminders: no new logic needed; once balance is 0 the status becomes `paid`, `loadByBalanceToken` returns null (unless courses still undecided, by existing design), and reminders only fire for `deposit_paid` with balance > 0. Tests will lock this in.

## Tests
Manual partial then full (status deposit_paid then paid), over-balance rejected, double submit (same request id counted once), reminder skipped after manual payment, token dead after paid (pure link-state check extracted from `loadByBalanceToken`), tie-out split card deposit + cash balance. Then full unit and browser suites.

## Not done
No publishing, Stripe runs, test bookings, Ladies Festival/Night or old bookings changes.
