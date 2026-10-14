import { sendEventBookingEmails, serviceClient, verifyEventsWebhook } from "../_shared/stripe-events.ts";

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
    .select("id,payment_method");
  if (!data?.length) return; // already paid — idempotent
  // Card / Pay by Bank bookings get their first emails once paid; bank transfer had a "booked" email already.
  await sendEventBookingEmails(sb, bookingId, "paid");
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
      default:
        console.log("Unhandled events webhook:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("stripe-events-webhook error", e);
    return new Response("Webhook error", { status: 400 });
  }
});
