import {
  ensureBalanceToken, recomputeBooking, sendEventBookingEmails, serviceClient, syncEventBookingFees, verifyEventsWebhook,
} from "../_shared/stripe-events.ts";

/** Find the payment row: new sessions carry payment_id; older ones fall back to the booking's full payment. */
async function findPayment(sb: any, bookingId: string, paymentId?: string | null) {
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

async function markPaid(meta: any, piId?: string | null, amountPence?: number | null) {
  const bookingId: string | undefined = meta?.booking_id;
  if (!bookingId) return;
  const sb = serviceClient();
  const pay = await findPayment(sb, bookingId, meta?.payment_id);
  if (!pay) return;
  // Per-payment amount check (warn only, never reject a real payment).
  if (amountPence != null && amountPence !== pay.amount_pence + pay.fee_pence) {
    console.warn("events webhook: paid amount differs from payment amount + fee", { bookingId, paymentId: pay.id, amountPence, expected: pay.amount_pence + pay.fee_pence });
  }
  const { data: updated } = await sb.from("event_booking_payments")
    .update({ status: "paid", paid_at: new Date().toISOString(), ...(piId && { stripe_payment_intent_id: piId }) })
    .eq("id", pay.id).neq("status", "paid").select("id");
  if (!updated?.length) return; // already processed — idempotent

  const { data: b } = await sb.from("event_bookings").select("payment_plan,payment_status,stripe_payment_intent_id").eq("id", bookingId).maybeSingle();
  if (!b) return;
  if (b.payment_plan !== "deposit") {
    // Full payment: exactly today's booking update.
    await sb.from("event_bookings").update({
      payment_status: "paid", balance_paid: true, paid_at: new Date().toISOString(),
      ...(piId && { stripe_payment_intent_id: piId }),
    }).eq("id", bookingId).neq("payment_status", "paid");
  } else if (pay.kind === "deposit" && piId) {
    await sb.from("event_bookings").update({ stripe_payment_intent_id: piId }).eq("id", bookingId);
  }
  const state = await recomputeBooking(sb, bookingId);
  await syncEventBookingFees(sb, bookingId, piId ?? pay.stripe_payment_intent_id ?? b.stripe_payment_intent_id);

  // Decide-later guests need a link to choose courses later.
  const { count: undecided } = await sb.from("event_guest_course_choices").select("id", { count: "exact", head: true }).eq("booking_id", bookingId).eq("decide_later", true);
  if (b.payment_plan === "deposit" || (undecided ?? 0) > 0) await ensureBalanceToken(sb, bookingId);

  const stage = pay.kind === "deposit" ? (state?.status === "paid" ? "paid" : "deposit") : pay.kind === "balance" ? "balance_paid" : "paid";
  await sendEventBookingEmails(sb, bookingId, stage);
}

/** Refund / lost dispute: store the refunded amount on the payment and re-open the balance. */
async function applyRefund(piId: string | null | undefined, refundedPence: number | null) {
  if (!piId) return;
  const sb = serviceClient();
  let { data: pay } = await sb.from("event_booking_payments").select("*").eq("stripe_payment_intent_id", piId).maybeSingle();
  let bookingId = pay?.booking_id;
  if (!bookingId) {
    const { data } = await sb.from("event_bookings").select("id").eq("stripe_payment_intent_id", piId).maybeSingle();
    if (!data) return;
    bookingId = data.id;
    pay = await findPayment(sb, data.id, null);
  }
  if (pay && refundedPence != null) {
    const r = Math.max(pay.refunded_pence ?? 0, Math.min(refundedPence, pay.amount_pence + pay.fee_pence));
    await sb.from("event_booking_payments").update({ refunded_pence: r, ...(r >= pay.amount_pence + pay.fee_pence && { status: "refunded" }) }).eq("id", pay.id);
    await recomputeBooking(sb, bookingId);
  }
  await syncEventBookingFees(sb, bookingId, piId, { attempts: 1 });
}

const piOf = (o: any) => (typeof o?.payment_intent === "string" ? o.payment_intent : o?.payment_intent?.id);

/** Record an events-account payout (no ledger posting; the Treasurer tags the Lloyds line). */
async function recordPayout(p: any) {
  const sb = serviceClient();
  const { error } = await sb.from("event_stripe_payouts").upsert({
    stripe_payout_id: p.id, amount_pence: p.amount, currency: p.currency ?? "gbp",
    arrival_date: new Date((p.arrival_date ?? Date.now() / 1000) * 1000).toISOString().slice(0, 10), status: p.status ?? "paid",
  }, { onConflict: "stripe_payout_id" });
  if (error) console.error("events payout record failed", error);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const event = await verifyEventsWebhook(req);
    const obj = event.data?.object ?? {};
    switch (event.type) {
      case "checkout.session.completed":
        if (obj.payment_status !== "unpaid") await markPaid(obj.metadata, obj.payment_intent, obj.amount_total);
        break;
      case "checkout.session.async_payment_succeeded":
        await markPaid(obj.metadata, obj.payment_intent, obj.amount_total);
        break;
      case "payment_intent.succeeded":
        await markPaid(obj.metadata, obj.id, obj.amount_received ?? obj.amount);
        break;
      case "charge.refunded":
        await applyRefund(piOf(obj), obj.amount_refunded ?? null);
        break;
      case "charge.dispute.closed":
        // A lost dispute removes the money like a refund; won/other just refreshes fees.
        await applyRefund(piOf(obj), obj.status === "lost" ? (obj.amount ?? null) : null);
        break;
      case "charge.dispute.created":
      case "charge.dispute.funds_withdrawn":
      case "charge.dispute.funds_reinstated":
        await applyRefund(piOf(obj), null);
        break;
      case "payout.paid":
        await recordPayout(obj);
        break;
      default:
        console.log("Unhandled events webhook:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("stripe-events-webhook error", e);
    return new Response("Webhook error", { status: 400 });
  }
});
