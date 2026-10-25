import {
  ensureBalanceToken, recomputeBooking, sendEventBookingEmails, serviceClient, syncEventBookingFees, verifyEventsWebhook,
} from "../_shared/stripe-events.ts";
import { eventsMarkPaid, findPayment } from "../_shared/eventsMarkPaid.ts";

/** Payment paid: mark-paid, recalculation and balance link before the 200; fee refresh + emails after it. */
function markPaid(meta: any, piId?: string | null, amountPence?: number | null) {
  return eventsMarkPaid(serviceClient(), meta, piId, amountPence, {
    recomputeBooking, ensureBalanceToken,
    syncFees: (sb, id, pi) => syncEventBookingFees(sb, id, pi),
    sendEmails: (sb, id, stage) => sendEventBookingEmails(sb, id, stage as any),
  });
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
