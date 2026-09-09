import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, verifyWebhook } from "../_shared/stripe.ts";

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
  // Record the ACTUAL Stripe processing fee from the balance transaction so
  // Treasurer dining reconciliation is automatic for future meetings.
  await recordActualStripeFee(bookingId, session.payment_intent, env);
  try {
    await sendBookingEmails(bookingId, { stage: "paid" });
  } catch (e) {
    console.error("sendBookingEmails (paid) failed:", e);
  }
}

async function recordActualStripeFee(
  bookingId: string,
  paymentIntentId: string | null | undefined,
  env: StripeEnv,
) {
  if (!paymentIntentId) return;
  try {
    const stripe = createStripeClient(env);
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge.balance_transaction"],
    });
    const charge: any = (pi as any).latest_charge;
    const bt: any = charge?.balance_transaction;
    if (!bt || typeof bt === "string") {
      console.warn("No expanded balance_transaction for", paymentIntentId);
      return;
    }
    const { error } = await getSupabase()
      .from("bookings")
      .update({
        stripe_fee_pence: bt.fee ?? null,
        stripe_net_pence: bt.net ?? null,
        stripe_balance_transaction_id: bt.id ?? null,
      })
      .eq("id", bookingId)
      .eq("environment", env);
    if (error) console.error("Failed to store Stripe fee:", error);
  } catch (e) {
    // Never fail the webhook over fee capture — reconciliation can be manual.
    console.error("recordActualStripeFee failed:", e);
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

// ------------------- Dining booking refunds -------------------

async function handleBookingChargeRefunded(charge: any, env: StripeEnv) {
  const pi = charge.payment_intent;
  if (!pi) return;

  const { data: booking } = await getSupabase()
    .from("bookings")
    .select("id, contact_name, event_label, subtotal_pence, fee_pence, total_pence, journal_entry_id, refund_journal_entry_id")
    .eq("stripe_payment_intent_id", pi)
    .eq("environment", env)
    .maybeSingle();
  if (!booking) return; // not a dining booking

  const b: any = booking;

  const { error: updErr } = await getSupabase()
    .from("bookings")
    .update({ payment_status: "refunded" })
    .eq("id", b.id);
  if (updErr) console.error("Failed to mark booking refunded:", updErr);

  // Never posted to the ledger, or already reversed — nothing to do.
  if (!b.journal_entry_id || b.refund_journal_entry_id) return;

  try {
    const refunded: number = charge.amount_refunded ?? 0;
    if (refunded <= 0) return;

    const origSub: number = b.subtotal_pence ?? 0;
    const origFee: number = b.fee_pence ?? 0;
    const origTotal: number = origSub + origFee;

    let drSub = origSub;
    let drFee = origFee;
    if (origTotal > 0 && refunded !== origTotal) {
      // Rare partial refund: split proportionally, remainder to subtotal.
      drFee = Math.round((refunded * origFee) / origTotal);
      drSub = refunded - drFee;
    } else if (origTotal === 0) {
      drSub = refunded;
      drFee = 0;
    }

    const { data: accounts } = await getSupabase()
      .from("chart_of_accounts")
      .select("id, code")
      .in("code", ["1010", "4100", "4120"]);
    const suspense = accounts?.find((a: any) => a.code === "1010")?.id;
    const diningIncome = accounts?.find((a: any) => a.code === "4100")?.id;
    const feeCover = accounts?.find((a: any) => a.code === "4120")?.id;
    if (!suspense || !diningIncome) throw new Error("Missing 1010/4100 accounts");
    if (drFee > 0 && !feeCover) throw new Error("Missing 4120 account");

    const { data: openPeriod } = await getSupabase()
      .from("treasurer_periods")
      .select("id")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const today = new Date().toISOString().slice(0, 10);
    const label = `Refund — ${b.contact_name ?? "Unknown"} — ${b.event_label ?? "Dining"}`;

    const { data: entry, error: entryErr } = await getSupabase()
      .from("journal_entries")
      .insert({
        entry_date: today,
        description: label,
        source_type: "booking_refund",
        source_id: b.id,
        period_id: openPeriod?.id ?? null,
        created_by: null,
      })
      .select("id")
      .single();
    if (entryErr) throw entryErr;

    const lines: any[] = [
      { entry_id: entry.id, account_id: diningIncome, debit_pence: drSub, credit_pence: 0, description: label },
      { entry_id: entry.id, account_id: suspense, debit_pence: 0, credit_pence: refunded, description: label },
    ];
    if (drFee > 0) {
      lines.push({ entry_id: entry.id, account_id: feeCover, debit_pence: drFee, credit_pence: 0, description: label });
    }

    const { error: lineErr } = await getSupabase().from("journal_lines").insert(lines);
    if (lineErr) {
      await getSupabase().from("journal_entries").delete().eq("id", entry.id);
      throw lineErr;
    }

    const { error: linkErr } = await getSupabase()
      .from("bookings")
      .update({ refund_journal_entry_id: entry.id })
      .eq("id", b.id);
    if (linkErr) console.error("Failed to link refund journal entry:", linkErr);
  } catch (e) {
    console.error("Refund ledger reversal failed (needs manual reversal):", b.id, e);
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

// ------------------- Stripe payout handler -------------------

async function handlePayoutPaid(payout: any, env: StripeEnv) {
  // 1. Idempotency check — key on the Stripe payout ID itself, not the event ID.
  //    This is deliberately more robust than event-based dedup: it also covers
  //    any duplicate delivery from any source, not just Stripe's own retries.
  const { data: existing } = await getSupabase()
    .from("stripe_payouts")
    .select("id")
    .eq("stripe_payout_id", payout.id)
    .maybeSingle();
  if (existing) {
    console.log("payout.paid already processed, skipping:", payout.id);
    return;
  }

  // 2. Record the payout regardless of env, for visibility.
  const arrivalDate = new Date(payout.arrival_date * 1000).toISOString().slice(0, 10);
  const { data: payoutRow, error: payoutInsertErr } = await getSupabase()
    .from("stripe_payouts")
    .insert({
      stripe_payout_id: payout.id,
      amount_pence: payout.amount,
      currency: payout.currency,
      arrival_date: arrivalDate,
      status: payout.status,
      env,
    })
    .select("id")
    .single();
  if (payoutInsertErr) {
    console.error("Failed to record stripe_payouts row:", payoutInsertErr);
    return;
  }

  // 3. SANDBOX PAYOUTS NEVER TOUCH THE REAL LEDGER. Only 'live' posts.
  if (env !== "live") {
    console.log("Sandbox payout recorded, not posted to ledger:", payout.id);
    return;
  }

  // 4. Post Dr 1000 Bank / Cr 1010 Stripe Suspense. Wrap in try/catch so a
  //    ledger-posting failure never causes a non-200 response back to Stripe
  //    (which would trigger retries). If this fails, journal_entry_id stays
  //    null on the stripe_payouts row — that's the visible "needs manual
  //    posting" marker for the Treasurer to catch later.
  try {
    const { data: accounts } = await getSupabase()
      .from("chart_of_accounts")
      .select("id, code")
      .in("code", ["1000", "1010"]);
    const bankAcct = accounts?.find((a: any) => a.code === "1000")?.id;
    const suspenseAcct = accounts?.find((a: any) => a.code === "1010")?.id;
    if (!bankAcct || !suspenseAcct) throw new Error("Missing 1000/1010 accounts");

    const { data: openPeriod } = await getSupabase()
      .from("treasurer_periods")
      .select("id")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: entry, error: entryErr } = await getSupabase()
      .from("journal_entries")
      .insert({
        entry_date: arrivalDate,
        description: `Stripe payout — arrived ${arrivalDate} — £${(payout.amount / 100).toFixed(2)}`,
        source_type: "stripe_payout",
        source_id: payoutRow.id,
        period_id: openPeriod?.id ?? null,
        created_by: null, // system-generated, not a human-entered transaction
      })
      .select("id")
      .single();
    if (entryErr) throw entryErr;

    const { error: lineErr } = await getSupabase().from("journal_lines").insert([
      { entry_id: entry.id, account_id: bankAcct, debit_pence: payout.amount, credit_pence: 0 },
      { entry_id: entry.id, account_id: suspenseAcct, debit_pence: 0, credit_pence: payout.amount },
    ]);
    if (lineErr) {
      await getSupabase().from("journal_entries").delete().eq("id", entry.id);
      throw lineErr;
    }

    await getSupabase().from("stripe_payouts").update({ journal_entry_id: entry.id }).eq("id", payoutRow.id);
  } catch (e) {
    console.error("Failed to post payout to ledger (payout recorded, needs manual posting):", e);
  }
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
        await handleBookingChargeRefunded(event.data.object, env);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleDuesSubscriptionUpdated(event.data.object);
        break;
      case "payout.paid":
        await handlePayoutPaid(event.data.object, env);
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
