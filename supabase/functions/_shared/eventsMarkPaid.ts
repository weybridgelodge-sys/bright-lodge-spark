// Events-account "payment paid" path (stripe-events-webhook). Dependency-injected so it
// can be tested without Stripe or email libraries. Before the reply: conditional mark-paid,
// booking update, recalculation, balance link. After the reply: Stripe fee refresh, emails.
import { type RunAfterReply, runAfterReply } from "./afterReply.ts";

export interface EventsMarkPaidDeps {
  recomputeBooking: (sb: any, bookingId: string) => Promise<any>;
  ensureBalanceToken: (sb: any, bookingId: string) => Promise<string>;
  syncFees: (sb: any, bookingId: string, piId: string | null | undefined) => Promise<unknown>;
  sendEmails: (sb: any, bookingId: string, stage: string) => Promise<unknown>;
  runner?: RunAfterReply;
}

/** Find the payment row: new sessions carry payment_id; older ones fall back to the booking's full payment. */
export async function findPayment(sb: any, bookingId: string, paymentId?: string | null) {
  if (paymentId) {
    const { data } = await sb.from("event_booking_payments").select("*").eq("id", paymentId).eq("booking_id", bookingId).maybeSingle();
    if (data) return data;
  }
  const { data: rows } = await sb.from("event_booking_payments").select("*").eq("booking_id", bookingId).eq("kind", "full").order("created_at", { ascending: false }).limit(1);
  if (rows?.[0]) return rows[0];
  // Booking created before payment rows existed: create its full payment from the booking.
  const { data: b } = await sb.from("event_bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return null;
  const { data: created } = await sb.from("event_booking_payments").insert({
    booking_id: b.id, kind: "full", method: ["card", "pay_by_bank", "bank_transfer"].includes(b.payment_method) ? b.payment_method : "manual",
    amount_pence: b.subtotal_pence ?? Math.max(0, (b.total_pence ?? 0) - (b.fee_pence ?? 0)), fee_pence: b.fee_pence ?? 0,
    stripe_session_id: b.stripe_session_id, stripe_payment_intent_id: b.stripe_payment_intent_id,
  }).select("*").maybeSingle();
  return created;
}

/** Returns "paid" when this delivery won, "already_paid" when another did, "not_found" otherwise. */
export async function eventsMarkPaid(sb: any, meta: any, piId: string | null | undefined, amountPence: number | null | undefined, deps: EventsMarkPaidDeps) {
  const bookingId: string | undefined = meta?.booking_id;
  if (!bookingId) return "not_found";
  const pay = await findPayment(sb, bookingId, meta?.payment_id);
  if (!pay) return "not_found";
  // Per-payment amount check (warn only, never reject a real payment).
  if (amountPence != null && amountPence !== pay.amount_pence + pay.fee_pence) {
    console.warn("events webhook: paid amount differs from payment amount + fee", { bookingId, paymentId: pay.id, amountPence, expected: pay.amount_pence + pay.fee_pence });
  }
  const { data: updated } = await sb.from("event_booking_payments")
    .update({ status: "paid", paid_at: new Date().toISOString(), ...(piId && { stripe_payment_intent_id: piId }) })
    .eq("id", pay.id).neq("status", "paid").select("id");
  if (!updated?.length) return "already_paid"; // already processed — idempotent

  const { data: b } = await sb.from("event_bookings").select("payment_plan,payment_status,stripe_payment_intent_id").eq("id", bookingId).maybeSingle();
  if (!b) return "not_found";
  if (b.payment_plan !== "deposit") {
    await sb.from("event_bookings").update({
      payment_status: "paid", balance_paid: true, paid_at: new Date().toISOString(),
      ...(piId && { stripe_payment_intent_id: piId }),
    }).eq("id", bookingId).neq("payment_status", "paid");
  } else if (pay.kind === "deposit" && piId) {
    await sb.from("event_bookings").update({ stripe_payment_intent_id: piId }).eq("id", bookingId);
  }
  const state = await deps.recomputeBooking(sb, bookingId);

  // Decide-later guests need a link to choose courses later.
  const { count: undecided } = await sb.from("event_guest_course_choices").select("id", { count: "exact", head: true }).eq("booking_id", bookingId).eq("decide_later", true);
  if (b.payment_plan === "deposit" || (undecided ?? 0) > 0) await deps.ensureBalanceToken(sb, bookingId);

  const stage = pay.kind === "deposit" ? (state?.status === "paid" ? "paid" : "deposit") : pay.kind === "balance" ? "balance_paid" : "paid";
  const feePi = piId ?? pay.stripe_payment_intent_id ?? b.stripe_payment_intent_id;
  void (deps.runner ?? runAfterReply)(`event-paid ${String(bookingId).slice(0, 8)}`, async () => {
    await deps.syncFees(sb, bookingId, feePi);
    await deps.sendEmails(sb, bookingId, stage);
  });
  return "paid";
}
