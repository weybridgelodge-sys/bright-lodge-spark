import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";
import { feeLineItemName } from "../_shared/cardFee.ts";
import { quoteBalance } from "../_shared/eventPricing.ts";
import { eventsStripe, serviceClient } from "../_shared/stripe-events.ts";
import { loadByBalanceToken } from "../_shared/eventBalanceAccess.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const INVALID = { error: "This link is no longer valid. Please contact the Secretary if you think this is wrong." };
const Body = z.object({
  token: z.string().max(100),
  method: z.enum(["card", "pay_by_bank"]),
  cover_fee: z.boolean().default(false),
  origin: z.string().url(),
  website: z.string().max(0).optional().default(""),
});

// Public: pay the outstanding balance for a deposit booking (card / Pay by Bank only).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const p = Body.safeParse(await req.json().catch(() => ({})));
    if (!p.success) return json({ error: "Please check the form and try again." }, 400);
    const sb = serviceClient();
    const ctx = await loadByBalanceToken(sb, p.data.token);
    if (!ctx || !ctx.balanceOpen) return json(INVALID, 404);
    const { booking: b, ev } = ctx;

    // Server recalculates from the stored balance; client amounts are never trusted.
    const q = quoteBalance({ balancePence: b.balance_due_pence, method: p.data.method, coverFee: ev.fee_cover_enabled !== false && p.data.cover_fee });
    if (q.chargePence <= 0) return json(INVALID, 404);
    const stripe = eventsStripe();

    // Close any earlier unpaid balance session so the balance can't be paid twice.
    const { data: open } = await sb.from("event_booking_payments").select("id,stripe_session_id").eq("booking_id", b.id).eq("kind", "balance").eq("status", "pending");
    for (const o of open ?? []) {
      if (o.stripe_session_id) { try { await stripe.checkout.sessions.expire(o.stripe_session_id); } catch (_) { /* already expired/complete */ } }
      await sb.from("event_booking_payments").update({ status: "expired" }).eq("id", o.id).eq("status", "pending");
    }

    const { data: pay, error } = await sb.from("event_booking_payments").insert({
      booking_id: b.id, kind: "balance", method: p.data.method, amount_pence: q.chargePence, fee_pence: q.feePence, status: "pending",
    }).select("id").maybeSingle();
    if (error || !pay) throw error ?? new Error("payment row");

    const stripeName = ev.name || ev.public_title;
    const metadata = { event_id: ev.id, event_slug: ev.slug, booking_id: b.id, booking_reference: b.reference, payment_id: pay.id, payment_kind: "balance" };
    const suffix = ev.statement_descriptor ? String(ev.statement_descriptor).slice(0, 22) : undefined;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: b.contact_email || undefined,
      payment_method_types: p.data.method === "card" ? ["card"] : ["pay_by_bank"],
      line_items: [
        { quantity: 1, price_data: { currency: "gbp", unit_amount: q.chargePence, product_data: { name: `${stripeName} — Balance` } } },
        ...(q.feePence > 0 ? [{ quantity: 1, price_data: { currency: "gbp", unit_amount: q.feePence, product_data: { name: feeLineItemName(p.data.method) } } }] : []),
      ],
      metadata,
      client_reference_id: b.id,
      payment_intent_data: { description: stripeName, metadata, ...(suffix && { statement_descriptor_suffix: suffix }) },
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      success_url: `${p.data.origin}/events/${ev.slug}/confirmation?ref=${encodeURIComponent(b.reference)}&t=${b.access_token}`,
      cancel_url: `${p.data.origin}/events/balance/${p.data.token}?cancelled=1`,
    } as any);
    await sb.from("event_booking_payments").update({ stripe_session_id: session.id }).eq("id", pay.id);
    return json({ url: session.url });
  } catch (e) {
    console.error("create-event-balance-checkout error", e);
    return json({ error: "Sorry, we could not start your payment. Please try again or contact the Secretary." }, 500);
  }
});
