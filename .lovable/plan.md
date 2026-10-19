# Store the expected amount on every booking (plan only)

Nothing has been changed. Everything below comes from reading the code and the live data.

## Findings

### (b) Where "Card payments charged" comes from
It does read `bookings.total_pence`. The Dining Reconciliation tab (`DiningReconciliationTab.tsx`, lines 145–175) adds up `total_pence` for bookings on that meeting with status `paid` **and** a Stripe payment ID. It also adds up `stripe_fee_pence` for "Less actual Stripe fees", including refunded card bookings.

For 21 Oct 2026 the live data has 12 paid card bookings: subtotal £452.00, fee £10.54, total **£462.54**. That matches the panel. The £429.70 you got is exactly £32.84 lower, which is booking **7c7125aa** (£32.00 + £0.84 fee). So I think your sum was missing that booking. My guess is it was left out because it has no register row linked to it. None of the 21 Oct bookings currently show a `festive_board_attendance.booking_id` link. Please re-check that one booking.

### (a) Everything that reads or adds up subtotal / fee / total on `bookings`
Event bookings (`event_bookings`, `event_booking_payments`) are a different table and are not affected.

| Place | What it does | Limited to card? | Risk after the change |
|---|---|---|---|
| Reconciliation "Card payments charged" / "Net received from card" | sum of `total_pence`, `stripe_fee_pence` | Yes (paid + Stripe payment ID) | None |
| "Other methods collected" | sums `festive_board_attendance.amount_pence` | Doesn't read bookings | None |
| "Post Stripe receipts to ledger" (lines 185–260) | credits `subtotal_pence`/`fee_pence` | Yes (paid + Stripe payment ID + Stripe fee known) | None |
| GMC invoice / headcount | attendance rows only | Doesn't read bookings | None |
| payments-webhook refund journal | `subtotal`/`fee` for reversal | Yes (looked up by Stripe payment ID) | None |
| stripe-fees / backfill-stripe-fees | fills in Stripe fees | Yes (Stripe payment ID) | None |
| waitlist-refund-sweep | `total_pence` in the refund email | Only refunds rows with a Stripe payment ID; others are closed silently | None |
| get-booking-by-session / CheckoutReturn page | shows base/fee/total | Card only (found by Stripe session) | None |
| **send-booking-emails (confirmation + lodge notification)** | `totalAmount` and `amountLines` from the booking | **No** | **Would change.** £0 is hidden today, so bank and pay-on-the-night emails show no amount. After the change they would show "Total £35.00". There would be no fee line, but the email still changes. |
| **Festive Board admin booking list** (`FestiveBoardAdmin.tsx` ~458) | shows "· £x" next to each booking | **No** | Would start showing £35.00 / £70.00 for bank and cash bookings |
| save-meeting-response | writes 0/0/0 on insert | n/a | This is where the change goes |
| Database functions and views | none read these columns on `bookings` (checked with a query) | n/a | None |

### (c) Customer-facing amounts
- **Confirmation email and lodge notification:** these use `total_pence`, `subtotal_pence` and `fee_pence`. They are protected as described below.
- **Member "my bookings":** the profile and member pages don't show booking amounts. The only member-related mention is the private note about saved dietary requirements.
- **Checkout return page:** card bookings only.

### Live data
- Confirmed and dining, all at 0: 14 bank-transfer and 3 cash-cheque bookings (6 on 12 Sep, 11 on 21 Oct).
- Blank method (5 rows): all are meeting-only, so no meal was booked. The base price is £0, so they stay at 0.
- 15 paid bookings with a blank method and no meeting are Ladies Festival card bookings. Their amounts are already stored, so they're left alone.
- Apologies (2) and the refunded booking (1) are left alone.

## Proposal

1. **New bookings (save-meeting-response):** when the option is meeting-and-festive-board and the method is not card, set `subtotal_pence = total_pence = (1 + guestCount) × meeting.dining_price_pence`, and `fee_pence = 0`. Meeting-only and apologies bookings stay 0. Nothing else in the Festive Board form has a price, so nothing else is added. The price comes from the meeting record, never from the browser.
2. **Card path (create-checkout):** unchanged.
3. **Keep the emails unchanged:** in send-booking-emails, show the amount lines only when the booking was paid by Stripe (it has a Stripe payment ID or session). Bank and pay-on-the-night emails then look exactly as they do today. They show no amount and no fee.
4. **Admin booking list:** leave as is, so it shows the expected £ for every booking. Or, if you prefer, add "(expected)" for bookings not paid by card. Your call.
5. **Not touched:** `festive_board_attendance.amount_pence` / `payment_method`, the register trigger, the reconciliation panel, ledger posting, GMC invoice, refund handling.
6. **Tests:** expected amount for 1 diner (3500) and 1 + 1 guest (7000) on bank and cash; meeting-only = 0; apologies = 0; card unchanged; the email shows no amount lines for a non-card booking.

### Proposed backfill (NOT run)
```sql
UPDATE public.bookings b
SET subtotal_pence = (1 + COALESCE((b.details->>'guestCount')::int, 0)) * m.dining_price_pence,
    total_pence    = (1 + COALESCE((b.details->>'guestCount')::int, 0)) * m.dining_price_pence,
    fee_pence      = 0
FROM public.festive_board_meetings m
WHERE m.id = b.meeting_id
  AND b.payment_status = 'confirmed'
  AND b.details->>'meetingOption' = 'meeting-and-festive-board'
  AND COALESCE(b.details->>'paymentMethod','') <> 'card'
  AND b.stripe_payment_intent_id IS NULL
  AND b.total_pence = 0
  AND m.dining_price_pence IS NOT NULL;
```
Rows it would change (17, all at £35/diner):

| Booking | Meeting | Method | Diners | New total |
|---|---|---|---|---|
| 0856323d, 572dfe1e, 8ca489f9, 9fcc2abc, a34a40e7, e9a277b2 | 12 Sep | bank | 1 each | £35.00 each |
| 0aca2594, 18375dfd, 7aa21049, b07f1e5d, bc60167d | 21 Oct | bank | 1 each | £35.00 each |
| 23757ad2, 2bf00ab1, ee865eec | 21 Oct | bank | 2 each | £70.00 each |
| 36e1028e, 5364a3ea | 21 Oct | cash-cheque | 2 each | £70.00 each |
| eefd7894 | 21 Oct | cash-cheque | 1 | £35.00 |

Total expected: £805.00 (12 Sep £210.00, 21 Oct £595.00).

## Order once approved
1. Make the email change (step 3) and deploy it first, so no email can show the new amount.
2. Change save-meeting-response and add the tests, then deploy.
3. Run the backfill only after your separate go-ahead, then re-read the 21 Oct reconciliation panel to confirm "Card payments charged" is still £462.54.

## Not verified
- `guestCount` is taken to be the number of guests in the details. If any booking has a guest list that doesn't match its count, the diner count could be wrong. I would check this before the backfill.
- I haven't confirmed why 7c7125aa was missing from your £429.70 figure.
