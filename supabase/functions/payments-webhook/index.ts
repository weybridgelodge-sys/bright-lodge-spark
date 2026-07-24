import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";
import { sendBookingEmails } from "../_shared/send-booking-emails.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  // Dues checkout — routed by metadata.kind
  if (session.metadata?.kind === "dues") {
    await handleDuesCheckoutCompleted(session, env);
    return;
  }

  const bookingId = session.metadata?.booking_id;
  if (!bookingId) {
    console.warn("checkout.session.completed without booking_id metadata", session.id);
    return;
  }
  const { data: existing } = await getSupabase()
    .from("bookings")
    .select("payment_status")
    .eq("id", bookingId)
    .eq("environment", env)
    .maybeSingle();
  const isWaitlisted = existing?.payment_status === "waitlisted";
  const { error } = await getSupabase()
    .from("bookings")
    .update({
      payment_status: isWaitlisted ? "waitlisted" : "paid",
      stripe_payment_intent_id: session.payment_intent ?? null,
      paid_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("environment", env);
  if (error) {
    console.error("Failed to mark booking paid:", error);
    return;
  }
  try {
    await sendBookingEmails(bookingId, { stage: "paid" });
  } catch (e) {
    console.error("sendBookingEmails (paid) failed:", e);
  }
}

async function handlePaymentFailed(intent: any, env: StripeEnv) {
  const { error } = await getSupabase()
    .from("bookings")
    .update({ payment_status: "failed" })
    .eq("stripe_payment_intent_id", intent.id)
    .eq("environment", env);
  if (error) console.error("Failed to mark booking failed:", error);
}

// ------------------- Dues handlers -------------------

async function handleDuesCheckoutCompleted(session: any, _env: StripeEnv) {
  const subId = session.metadata?.dues_subscription_id;
  if (!subId) return;
  const patch: Record<string, unknown> = {
    stripe_customer_id: session.customer ?? null,
    stripe_checkout_session_id: session.id,
    updated_at: new Date().toISOString(),
  };
  if (session.mode === "subscription") {
    patch.stripe_subscription_id = session.subscription ?? null;
    patch.status = "active";
  } else {
    patch.stripe_payment_intent_id = session.payment_intent ?? null;
    // For lump sum, if payment_status is 'paid' (card) mark completed; bacs will settle later
    patch.status = session.payment_status === "paid" ? "completed" : "active";
  }
  await getSupabase().from("dues_subscriptions").update(patch).eq("id", subId);
}

async function findDuesSubscriptionByPI(pi: string): Promise<{ id: string; member_id: string; method: string } | null> {
  const { data } = await getSupabase()
    .from("dues_subscriptions")
    .select("id,member_id,method")
    .eq("stripe_payment_intent_id", pi)
    .maybeSingle();
  return (data as any) ?? null;
}

async function findDuesSubscriptionByStripeSub(subId: string): Promise<{ id: string; member_id: string; method: string } | null> {
  const { data } = await getSupabase()
    .from("dues_subscriptions")
    .select("id,member_id,method")
    .eq("stripe_subscription_id", subId)
    .maybeSingle();
  return (data as any) ?? null;
}

async function handleDuesPaymentIntentSucceeded(pi: any) {
  const sub = await findDuesSubscriptionByPI(pi.id);
  if (!sub) return;
  await getSupabase().from("dues_payments").upsert(
    {
      subscription_id: sub.id,
      member_id: sub.member_id,
      type: "payment",
      amount_pence: pi.amount_received ?? pi.amount ?? 0,
      method: sub.method,
      stripe_payment_intent_id: pi.id,
      stripe_charge_id: pi.latest_charge ?? null,
      status: "succeeded",
      note: "Lump sum",
      occurred_at: new Date().toISOString(),
    },
    { onConflict: "stripe_payment_intent_id,type" },
  );
  await getSupabase().from("dues_subscriptions").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", sub.id);
}

async function handleDuesInvoicePaid(invoice: any) {
  const stripeSubId = invoice.subscription;
  if (!stripeSubId) return;
  const sub = await findDuesSubscriptionByStripeSub(stripeSubId);
  if (!sub) return;
  await getSupabase().from("dues_payments").upsert(
    {
      subscription_id: sub.id,
      member_id: sub.member_id,
      type: "payment",
      amount_pence: invoice.amount_paid ?? 0,
      method: sub.method,
      stripe_payment_intent_id: invoice.payment_intent ?? null,
      stripe_charge_id: invoice.charge ?? null,
      stripe_invoice_id: invoice.id,
      status: "succeeded",
      note: `Invoice ${invoice.number || invoice.id}`,
      occurred_at: new Date().toISOString(),
    },
    { onConflict: "stripe_payment_intent_id,type" },
  );
  await getSupabase().from("dues_subscriptions").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", sub.id);
}

async function handleDuesInvoiceFailed(invoice: any) {
  const sub = await findDuesSubscriptionByStripeSub(invoice.subscription);
  if (!sub) return;
  await getSupabase().from("dues_subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("id", sub.id);
}

async function handleDuesChargeRefunded(charge: any, _env: StripeEnv) {
  // The dues-refund function already logs the refund row. This webhook path
  // is a safety net in case refunds are issued outside the app.
  const refunds = charge.refunds?.data ?? [];
  for (const r of refunds) {
    // find sub by charge or PI
    let sub: { id: string; member_id: string; method: string } | null = null;
    if (charge.payment_intent) sub = await findDuesSubscriptionByPI(charge.payment_intent);
    if (!sub) continue;
    await getSupabase().from("dues_payments").upsert(
      {
        subscription_id: sub.id,
        member_id: sub.member_id,
        type: "refund",
        amount_pence: r.amount,
        method: sub.method,
        stripe_payment_intent_id: charge.payment_intent ?? null,
        stripe_charge_id: charge.id,
        stripe_refund_id: r.id,
        status: r.status ?? "succeeded",
        note: r.reason ?? "Refund",
        occurred_at: new Date((r.created ?? Date.now() / 1000) * 1000).toISOString(),
      },
      { onConflict: "stripe_refund_id" },
    );
  }
}

async function handleDuesSubscriptionUpdated(subscription: any) {
  const sub = await findDuesSubscriptionByStripeSub(subscription.id);
  if (!sub) return;
  await getSupabase()
    .from("dues_subscriptions")
    .update({ status: subscription.status, updated_at: new Date().toISOString() })
    .eq("id", sub.id);
}

// ------------------- Dispatcher -------------------

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook with invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;

  try {
    const event = await verifyWebhook(req, env);
    switch (event.type) {
      case "checkout.session.completed":
      case "transaction.completed":
        await handleCheckoutCompleted(event.data.object, env);
        break;
      case "checkout.session.async_payment_failed":
      case "transaction.payment_failed":
        await handlePaymentFailed(event.data.object, env);
        break;
      case "payment_intent.succeeded":
        await handleDuesPaymentIntentSucceeded(event.data.object);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded":
        await handleDuesInvoicePaid(event.data.object);
        break;
      case "invoice.payment_failed":
        await handleDuesInvoiceFailed(event.data.object);
        break;
      case "charge.refunded":
        await handleDuesChargeRefunded(event.data.object, env);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleDuesSubscriptionUpdated(event.data.object);
        break;
      default:
        console.log("Unhandled webhook event:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
