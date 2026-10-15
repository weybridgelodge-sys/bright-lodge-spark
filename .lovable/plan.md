# Stage 4 — Deposits and balance collection (PLAN ONLY)

Nothing is built, migrated, deployed or changed until you approve. The SQL below is shown for review only.

## What I checked before writing this
- The event booking table already has `payment_plan` (default `full`), `subtotal_pence`, `fee_pence`, `total_pence`, `items_subtotal_pence`, the Stage 0 legacy `deposit_pence / deposit_paid / balance_pence / balance_paid` columns, and `access_token`.
- Events already store `payment_mode` (`full` / `full_or_deposit`), `deposit_percent` and `balance_due_date`, with a check that the due date is on or before the event date.
- Seat holds use `event_booking_holds_seat(status, method, created)`: `paid` holds; `pending` holds for bank transfer or for 30 minutes.
- **There is currently one public event booking in total: a pending card booking (£71.60) that has expired. No booking is paid.** The "Christmas backfill" therefore changes no paid booking; it is written so it would be safe if one existed.
- Event Accounts actuals (`src/lib/treasurer/eventTieOut.ts`) count only fully paid bookings, using subtotal minus pre-orders for Ticket sales and `items_subtotal_pence` for Pre-orders.
- Scheduled jobs in this project are hourly/daily database schedules calling functions (e.g. `secretary-ugle-reminder-hourly`).

## Stages

### 4A — Database (one additive migration)
New payment ledger, booking columns, reminder log, updated seat-hold rule. SQL below.

### 4B — Shared pricing (pure, tested)
In `_shared/eventPricing.ts` (re-exported to the browser), add:
- `allowedPlanMethods(plan)`: deposit → card, Pay by Bank only.
- `bookingBalanceState({ orderPence, payments })`: sums paid minus refunded order amounts (fees excluded) → `amountPaid`, `balanceDue`, `status` (`pending` / `deposit_paid` / `paid` / `refunded`).
- `depositLineName(percent, orderPence)` → "Deposit (33.3% of £213.00)"; percent text formatted from the event, never hard-coded.
- `allocateReceived(payment, booking)`: splits money received pro rata between Ticket sales and Pre-orders for actuals (see question 1).
- Existing `quoteBooking` / `quoteBalance` reused unchanged.

### 4C — Booking checkout (`create-event-checkout`)
- Accept optional `plan: "full" | "deposit"`; reject `deposit` unless event `payment_mode='full_or_deposit'`, method is card/Pay by Bank, and today is before `balance_due_date` (after that date only "Pay in full" is offered).
- Server recalculates with `quoteBooking`; ignores client totals.
- Deposit Stripe session: one line "Deposit (X% of £Y)" + separate fee line (if chosen); metadata adds `payment_kind=deposit`, `payment_id`. Full plan: lines exactly as today plus `payment_kind=full`, `payment_id`.
- Inserts an `event_booking_payments` row (status `pending`) before creating the session, and stores the Stripe session id on it.
- Booking stores `payment_plan`, `balance_due_date` (copied from the event), `balance_due_pence = order`, `amount_paid_pence = 0`.

### 4D — Webhook (`stripe-events-webhook`)
- Find the payment by `metadata.payment_id`; fallback for old sessions with no payment id: booking id → its single full payment (keeps Christmas-style bookings working).
- Per-payment amount check: Stripe amount must equal that payment's `amount_pence + fee_pence` (warn as today, never reject).
- Mark the payment paid (idempotent: only when not already paid), then recompute the booking from all payments: `amount_paid_pence`, `balance_due_pence`, `payment_status` = `paid` when balance 0, else `deposit_paid`. Set `balance_paid`/`paid_at` only when fully paid (so existing screens keep meaning).
- Fee sync becomes per payment (`syncEventPaymentFees` writes Stripe fee/net on the payment row; booking-level `stripe_fee_pence` = sum, so existing tie-out keeps working).
- `charge.refunded`: find payment by payment intent, store `refunded_pence` (order portion = refunded amount minus any fee portion, see question 2), recompute booking → balance re-opens; status falls back to `deposit_paid`/`pending`-with-hold or `refunded` when nothing remains. Disputes: fee sync only (as today), plus Treasurer flag; money is not removed until a dispute is lost (`charge.dispute.closed` with status `lost` treats the disputed amount like a refund).
- Emails: deposit paid → "deposit received" email with balance link; balance paid → "paid in full" email; full → as today.

### 4E — Balance link
- New public function `create-event-balance-checkout` (`verify_jwt=false`): body `{ token, method, coverFee }`. Token is looked up by SHA-256 hash; rejects unknown, wrong, already-paid (balance 0), cancelled/refunded, or event-date-passed tokens with one generic "This link is no longer valid" message (no booking data leaked). Card / Pay by Bank only; charges `balance_due_pence` + fee via `quoteBalance`; metadata `payment_kind=balance`, `payment_id`. Reuses an open pending balance payment if one exists less than 30 minutes old to stop duplicate sessions.
- New public function `get-event-balance` (`verify_jwt=false`): token → event title/date, reference, order total, paid, balance, due date, overdue flag, allowed methods.
- New public page `/events/balance/:token` (`PublicEventBalance.tsx`): what you owe, method choice, fee Yes/No (only if event fee toggle on), Pay button; reuses BookingCore pieces; phone-friendly, honeypot, noindex. Return URL reuses the existing confirmation page.
- Token: 32 random bytes, base64url, only the hash is stored; it stays the same until paid (emailed links keep working); Treasurer "regenerate link" invalidates the old one.

### 4F — Reminders
- New function `event-balance-reminders` run by one daily schedule at 08:05 UTC (once a day; no sub-hourly polling).
- For each booking with `balance_due_pence > 0`, `payment_status='deposit_paid'`, event not archived/past: send `balance_14d` when due date is 14 days away or fewer (and more than 3), `balance_3d` when 3 or fewer and not yet due. Catches up if a run is missed but never sends one kind twice.
- `choices_reminder` (only if the event's "decide later" setting is on and the booking has guests with undecided courses): sent with the 14-day reminder window; link goes to the balance page, which shows choice selects when decide-later is on (see question 4).
- Idempotency: insert into `event_booking_reminders (booking_id, kind)` unique; send only when the insert succeeds; email idempotency key `event-reminder-{booking}-{kind}` as a second guard.
- Overdue: no job writes it; it is derived (`balance_due_date < today and balance > 0`) and shown to the Treasurer. Seats are never released for `deposit_paid`.
- Supports `dry_run` and `force` for admin/Treasurer testing (test sends only to julientidmarsh@pm.me).
- Daily Treasurer digest of newly overdue bookings: proposed as optional (question 5).

### 4G — Treasurer "Balances outstanding"
- New panel in Event Accounts per event: reference, name, order total, paid, balance due, due date, overdue badge, last reminder sent.
- Actions: "Copy link" and "Resend link" (and "Regenerate link") for Admin/Treasurer/Secretary via new function `event-balance-link` (checks the same helper as event-content writers + Treasurer); Treasurer view otherwise read-only. Copy requires generating a fresh token (only hashes are stored), so "Copy link" = regenerate + copy, with a confirm warning that older emailed links stop working. Alternative in question 3.
- Actuals: Ticket sales and Pre-orders become money actually received (paid payments minus refunds, allocated pro rata), Fee contributions = sum of paid payment fees, Stripe fees = sum of payment Stripe fees. For full-payment bookings this equals today's figures exactly (tested).
- Booking list status text adds "deposit paid — £X due by date".
- "Mark paid" (cash/cheque) stays record-only; on a deposit booking it records a manual balance payment row instead of overwriting.

### 4H — Confirmation page and emails
- `get-event-booking` returns plan, amount paid, balance due, due date; confirmation page and both booking emails show "Deposit paid", "Balance due £X by date" and the balance link (customer email only).
- New templates: `event-balance-reminder` (14d/3d variants by data), `event-choices-reminder`, `event-balance-paid` added to the registry; same branded layout.

### 4I — Public form
- Only when `payment_mode='full_or_deposit'`: a "Pay in full / Pay deposit now" choice above payment method. Choosing deposit hides bank transfer. Summary shows order total, deposit now, fee on the deposit, total now, balance and due date, before the Pay button. Simple events: nothing renders, request body unchanged.

## Migration SQL (for review — not run)

```sql
-- 1. Payment ledger
CREATE TABLE public.event_booking_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('full','deposit','balance')),
  method text NOT NULL CHECK (method IN ('card','pay_by_bank','bank_transfer','manual')),
  amount_pence integer NOT NULL CHECK (amount_pence >= 0),
  fee_pence integer NOT NULL DEFAULT 0 CHECK (fee_pence >= 0),
  refunded_pence integer NOT NULL DEFAULT 0 CHECK (refunded_pence >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','refunded','failed')),
  stripe_session_id text,
  stripe_payment_intent_id text,
  stripe_fee_pence integer,
  stripe_net_pence integer,
  stripe_other_fees_pence integer NOT NULL DEFAULT 0,
  stripe_balance_transaction_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_booking_payments_booking_idx ON public.event_booking_payments(booking_id);
CREATE UNIQUE INDEX event_booking_payments_session_uq ON public.event_booking_payments(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX event_booking_payments_pi_idx ON public.event_booking_payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

GRANT SELECT ON public.event_booking_payments TO authenticated;
GRANT ALL ON public.event_booking_payments TO service_role;
ALTER TABLE public.event_booking_payments ENABLE ROW LEVEL SECURITY;
-- Same readers as event_bookings; no client writes (functions use the service role).
CREATE POLICY "Event finance readers can view payments" ON public.event_booking_payments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.event_bookings b WHERE b.id = booking_id));

-- 2. Booking columns
ALTER TABLE public.event_bookings
  ADD COLUMN IF NOT EXISTS amount_paid_pence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due_pence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due_date date,
  ADD COLUMN IF NOT EXISTS balance_token_hash text,
  ADD COLUMN IF NOT EXISTS balance_token_created_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS event_bookings_balance_token_uq
  ON public.event_bookings(balance_token_hash) WHERE balance_token_hash IS NOT NULL;
-- No column grant on balance_token_hash to authenticated readers:
REVOKE SELECT (balance_token_hash) ON public.event_bookings FROM authenticated, anon;
-- (If event_bookings currently uses a table-level SELECT grant, this is applied as
--  table grant minus that column; verified against current grants before running.)

ALTER TABLE public.event_bookings DROP CONSTRAINT IF EXISTS event_bookings_payment_plan_chk;
-- payment_plan check from 0093 already allows ('full','deposit'); unchanged.

-- 3. Backfill (safe: only touches rows without a payment row)
INSERT INTO public.event_booking_payments
  (booking_id, kind, method, amount_pence, fee_pence, status, stripe_session_id,
   stripe_payment_intent_id, stripe_fee_pence, stripe_net_pence, stripe_other_fees_pence,
   stripe_balance_transaction_id, paid_at, created_at)
SELECT b.id, 'full', COALESCE(b.payment_method,'manual'),
       COALESCE(b.subtotal_pence, b.total_pence - COALESCE(b.fee_pence,0), 0),
       COALESCE(b.fee_pence,0),
       CASE WHEN b.payment_status = 'paid' THEN 'paid' ELSE 'pending' END,
       b.stripe_session_id, b.stripe_payment_intent_id, b.stripe_fee_pence, b.stripe_net_pence,
       COALESCE(b.stripe_other_fees_pence,0), b.stripe_balance_transaction_id, b.paid_at, b.created_at
FROM public.event_bookings b
WHERE b.source = 'public'
  AND NOT EXISTS (SELECT 1 FROM public.event_booking_payments p WHERE p.booking_id = b.id);

UPDATE public.event_bookings b SET
  amount_paid_pence = CASE WHEN b.payment_status = 'paid'
                           THEN COALESCE(b.subtotal_pence, b.total_pence - COALESCE(b.fee_pence,0), 0) ELSE 0 END,
  balance_due_pence = CASE WHEN b.payment_status = 'paid'
                           THEN 0 ELSE COALESCE(b.subtotal_pence, b.total_pence - COALESCE(b.fee_pence,0), 0) END
WHERE b.source = 'public';

-- 4. Seat holds: a paid deposit holds permanently; everything else unchanged
CREATE OR REPLACE FUNCTION public.event_booking_holds_seat(_status text, _method text, _created timestamptz)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT _status IN ('paid','deposit_paid')
      OR (_status = 'pending' AND (_method = 'bank_transfer' OR _created > now() - interval '30 minutes'))
$$;

-- 5. Reminder log (idempotency)
CREATE TABLE public.event_booking_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('balance_14d','balance_3d','choices')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, kind)
);
GRANT SELECT ON public.event_booking_reminders TO authenticated;
GRANT ALL ON public.event_booking_reminders TO service_role;
ALTER TABLE public.event_booking_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event finance readers can view reminders" ON public.event_booking_reminders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.event_bookings b WHERE b.id = booking_id));

COMMENT ON COLUMN public.event_bookings.deposit_pence IS 'DEPRECATED for public bookings: see event_booking_payments';
COMMENT ON COLUMN public.event_bookings.balance_pence IS 'DEPRECATED for public bookings: see balance_due_pence';
```

The two SELECT policies piggy-back on `event_bookings` RLS (a reader who can see the booking can see its payments), so no new access is granted. Status `deposit_paid` is a new value in a free-text column; I will check for any CHECK constraint on `payment_status` and extend it in the same migration if one exists. The schedule (`event-balance-reminders-daily`, `5 8 * * *`) is created after the function is deployed, not in this migration.

## Functions
- Changed: `create-event-checkout`, `stripe-events-webhook`, `get-event-booking`, `events-backfill-fees` (per payment), `_shared/stripe-events.ts`, `_shared/eventPricing.ts`.
- New: `create-event-balance-checkout`, `get-event-balance` (public), `event-balance-link` (staff), `event-balance-reminders` (scheduled).
- `config.toml`: `verify_jwt=false` only for the two new public functions and the scheduled one (cron-authenticated as existing reminders are).

## Files
- New: `src/pages/PublicEventBalance.tsx`, `src/components/members/treasurer/EventBalancesPanel.tsx`, three email templates, `src/test/eventBalance.test.ts`, `src/test/eventWebhookState.test.ts`, `src/test/eventReminders.test.ts`, `tests/browser/public-event-deposit.spec.ts`.
- Changed: `PublicEvent.tsx`, `BookingCore.tsx`, `PublicEventConfirmation.tsx`, `EventAccountsTab.tsx`, `eventTieOut.ts`, `event-booking-customer.tsx`, `event-booking-lodge.tsx`, `registry.ts`, `App.tsx` (one route).
- Untouched: `/ladies-festival`, `/ladies-night`, `LadiesFestival.tsx`, `LadiesFestivalTemplate.tsx`, old `bookings`, lodge checkout/webhook.

## Tests
- Maths: deposit on whole order incl. drinks, one-third rounding up (e.g. £90.00 → £30.00, £100.00 → £33.34), fee on amount charged now for each method, balance + fee, refund of deposit/balance re-opens balance, over-refund clamps at 0.
- Webhook state (pure reducer): full → paid; deposit → deposit_paid; deposit+balance → paid; duplicate event → no double count; refund → deposit_paid/refunded; amount mismatch warns only.
- Rules: deposit rejected for bank transfer, for `payment_mode='full'`, and after due date; tampered client totals ignored.
- Tokens: wrong, used (balance 0), cancelled, event-past all return the same generic failure; only hash stored.
- Reminders: 14d and 3d sent once each across reruns; missed day catches up once; no reminder when paid; choices reminder only when decide-later on and undecided guests exist.
- Simple-event regression: existing 24-combination Stripe line baseline unchanged (plus metadata keys), actuals for full bookings identical to today's figures, seat-hold truth table unchanged except `deposit_paid`.
- Browser: deposit choice and balance page at 320/390px using synthetic data and the Ladies Festival 2027 draft read-only; Christmas form unchanged.
- Rolled-back permission checks: anon/member cannot read payments or token hashes; Treasurer read; Admin/Treasurer/Secretary can resend.

## What could break
- Christmas: checkout gains `payment_kind`/`payment_id` metadata and a payment row; webhook fallback covers sessions created before deploy. The one existing expired pending booking gets a pending payment row and a £71.60 balance figure but no status change and no reminders (it is not `deposit_paid`).
- Actuals switch from "paid bookings" to "paid payments"; equal for full payments, guarded by tests.
- Any screen that treats "not `paid`" as unpaid/expired (the booking list text) must learn `deposit_paid`, otherwise a deposit booking would show "EXPIRED".
- Refund amounts that include a fee need a rule (question 2).
- Deploy order: migration → webhook (accepts old and new metadata) → checkout → schedule.

## Questions
1. Actuals split for deposits: allocate received money pro rata between Ticket sales and Pre-orders (proposed), or fill Pre-orders first?
2. Refunds: treat refunds as coming off the order first and the fee contribution last (proposed), or pro rata?
3. "Copy link": OK that copying generates a new link (old emailed link stops working), or store the token encrypted so the same link can be copied any time?
4. "Decide later" reminder: let the booker choose courses on the balance page (proposed), or just remind them to contact the lodge?
5. Overdue: Treasurer list only (proposed), or also a weekly overdue email to the Treasurer?
6. After the balance due date, should the public form still offer deposits? Proposed: no, pay in full only.
