## Dues / Subscriptions — Committee Demo Build (TEST MODE)

Real-money feature, built entirely against **Stripe sandbox** and locked behind an admin-only route with a visible "TEST MODE — not yet live" banner. No member nav link.

### Scope confirmations / assumptions
- Amount is expressed as **pence** everywhere (£250 = `25000`).
- "Lodge year" reuses the existing `current_lodge_year()` helper (Oct–Sept).
- Monthly plan = Stripe subscription, 12 collections, one per month starting on setup. We do **not** try to prorate to the Sept anniversary in this demo (call this out in UI copy — "monthly plan bills for 12 months from today"). Simpler and unambiguous for demo.
- Lump sum = one-off Stripe Checkout in `payment` mode.
- Card + Bacs Direct Debit both offered (Stripe payment method types `card`, `bacs_debit`).
- Credit balance is tracked in `dues_subscriptions.credit_balance_pence` and only mutated through refunds/overpayments logged in `dues_payments`. Admin can issue a refund from credit (which just decreases the balance and issues a Stripe refund against a chosen payment).
- Price-change flow: admin schedules a new amount for a future lodge year → `dues_settings` row inserted with `effective_lodge_year` + `notice_sent_at NULL` + `apply_after`. Cron/edge sends notification email to affected members and sets `notice_sent_at`. A second scheduled job (or admin "apply now" button after ≥10 working days) swaps Stripe subscription prices.
- Notification email uses shared `_brand.ts`.

### Data model (migration)
```
dues_settings(
  id, annual_amount_pence, effective_lodge_year,
  notice_required boolean default true,
  notice_sent_at timestamptz, applied_at timestamptz,
  created_by, created_at, updated_at
)

dues_subscriptions(
  id, member_id (FK profiles), lodge_year int,
  plan text check in ('lump_sum','monthly'),
  method text check in ('card','bacs'),
  status text (setup|active|past_due|canceled|completed|paused),
  amount_pence int,                         -- total for the year
  stripe_customer_id text,
  stripe_subscription_id text,              -- monthly
  stripe_payment_intent_id text,            -- lump sum
  stripe_checkout_session_id text,
  credit_balance_pence int default 0,
  created_at, updated_at,
  unique(member_id, lodge_year)
)

dues_payments(
  id, subscription_id FK, member_id,
  type text ('payment','refund'),
  amount_pence int,                         -- always positive; sign implied by type
  method text,                              -- card|bacs
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_refund_id text,
  status text,                              -- succeeded|pending|failed
  note text,
  occurred_at timestamptz,
  created_at
)
```

RLS: all three tables → SELECT/INSERT/UPDATE only for `admin` role via `has_role`. `dues_subscriptions` also SELECT for own row (`member_id = auth.uid()`) so the future member-facing view keeps working. Full GRANTs to `authenticated` + `service_role`.

### Edge functions (all use `createStripeClient('sandbox')` explicitly)
1. `dues-create-checkout` — body: `{plan, method}`. Reads current `dues_settings`, creates Stripe customer if missing, creates Checkout Session:
   - `mode: 'subscription'` for monthly (creates recurring price on the fly with `unit_amount = round(annual/12)`, `interval: month`), `payment_method_types: [method === 'bacs' ? 'bacs_debit' : 'card']`.
   - `mode: 'payment'` for lump sum.
   Inserts pending `dues_subscriptions` row keyed on `metadata.dues_subscription_id`. Returns `{url}`.
2. `dues-webhook` — handles `checkout.session.completed`, `payment_intent.succeeded`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `customer.subscription.updated/deleted`. Writes to `dues_payments`, updates `dues_subscriptions.status`.
3. `dues-refund` — admin only. Body: `{payment_id, amount_pence}`. Calls `stripe.refunds.create({payment_intent, amount})`, inserts `dues_payments` refund row, updates credit balance if amount exceeds outstanding.
4. `dues-notify-price-change` — admin trigger + daily cron. For each `dues_settings` row with `notice_sent_at IS NULL AND effective_lodge_year > current`, email affected members (any active monthly subscription), stamp `notice_sent_at = now()`.
5. `dues-apply-price-change` — admin action. Only allowed when `notice_sent_at + 10 working days ≤ now()`. For each active monthly Stripe subscription: create a new Stripe Price, update the subscription's item to the new price with `proration_behavior: 'none'`. Stamp `applied_at`.

### Email template
`_shared/transactional-email-templates/dues-price-change-notice.tsx` — brand header, states old vs new annual amount, monthly equivalent, effective date, 10-working-days notice line.

### Frontend
- **Route**: `/admin/dues` (admin-only guard). No member nav link. Big amber banner: "TEST MODE — Stripe sandbox. Not yet live for real collection."
- **Admin dashboard** (`AdminDues.tsx`): tabs
  1. *Members* — table: name, plan, method, status, paid this year, credit balance, actions (View history, Refund).
  2. *Settings* — current annual amount card + form to schedule new amount for future lodge year, list of scheduled changes with "Send notice" / "Apply now" buttons and countdown.
  3. *Demo as member* — renders the member-facing dues setup UI inline (frequency + method radio, "Start setup" → checkout), so the Secretary can walk the committee through the flow without needing a fake member.
- **Refund dialog**: pick payment row, enter amount (default = full), confirm. Copy: "Card refunds typically appear in 5–10 days. Bacs Direct Debit refunds settle over ~5 working days via BACS."
- **Member payment history modal**: chronological list from `dues_payments`.

### Verification
- Confirm sandbox: hardcoded `'sandbox'` in every `createStripeClient` call — grep to prove it.
- Confirm gating: only `/admin/dues`, guard checks `has_role(user,'admin')`, no `<Link>` in members nav.
- Deploy edge functions, run a test checkout with Stripe test card `4242…` and Bacs test details, confirm webhook writes `dues_payments` row.
- Report back with the live route and a screenshot of the banner + dashboard.

### Out of scope for this demo (call out to user)
- Real member self-serve access (locked behind admin for now).
- Automatic annual rollover into a new lodge year's subscription — admin will re-run "start setup" for members next Sept once flow is approved.
- Dunning / collections chasing for failed Bacs payments beyond Stripe's default retry.
