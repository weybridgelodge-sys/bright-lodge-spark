import { sendEventBookingEmails, serviceClient, syncEventBookingFees, verifyEventsWebhook } from "../_shared/stripe-events.ts";

async function markPaid(bookingId: string | undefined, piId?: string | null, amountPence?: number | null) {
  if (!bookingId) return;
  const sb = serviceClient();
  if (amountPence != null) {
    const { data: exp } = await sb.from("event_bookings").select("subtotal_pence,fee_pence,total_pence").eq("id", bookingId).maybeSingle();
    const expected = exp ? (exp.subtotal_pence ?? exp.total_pence) + (exp.fee_pence ?? 0) : null;
    if (expected != null && expected !== amountPence) console.warn("events webhook: paid amount differs from subtotal + fee", { bookingId, amountPence, expected });
  }
  const { data } = await sb.from("event_bookings")
    .update({
      payment_status: "paid",
      balance_paid: true,
      paid_at: new Date().toISOString(),
      ...(piId && { stripe_payment_intent_id: piId }),
    })
    .eq("id", bookingId)
    .neq("payment_status", "paid")
    .select("id,payment_method,stripe_payment_intent_id");
  if (!data?.length) return; // already paid — idempotent
  // Actual Stripe fee from the events account balance transaction (never throws).
  await syncEventBookingFees(sb, bookingId, piId ?? data[0].stripe_payment_intent_id);
  // Card / Pay by Bank bookings get their first emails once paid; bank transfer had a "booked" email already.
  await sendEventBookingEmails(sb, bookingId, "paid");
}

/** Refund/dispute: re-read all fees on the booking's charge (refund and dispute fees included). */
async function refreshFeesForCharge(charge: any) {
  const pi = typeof charge?.payment_intent === "string" ? charge.payment_intent : charge?.payment_intent?.id;
  if (!pi) return;
  const sb = serviceClient();
  const { data } = await sb.from("event_bookings").select("id").eq("stripe_payment_intent_id", pi).maybeSingle();
  if (data) await syncEventBookingFees(sb, data.id, pi, { attempts: 1 });
}

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
        if (obj.payment_status !== "unpaid") await markPaid(obj.metadata?.booking_id, obj.payment_intent, obj.amount_total);
        break;
      case "checkout.session.async_payment_succeeded":
        await markPaid(obj.metadata?.booking_id, obj.payment_intent, obj.amount_total);
        break;
      case "payment_intent.succeeded":
        await markPaid(obj.metadata?.booking_id, obj.id, obj.amount_received ?? obj.amount);
        break;
      case "charge.refunded":
        await refreshFeesForCharge(obj);
        break;
      case "charge.dispute.created":
      case "charge.dispute.closed":
      case "charge.dispute.funds_withdrawn":
      case "charge.dispute.funds_reinstated":
        await refreshFeesForCharge({ payment_intent: obj.payment_intent });
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
