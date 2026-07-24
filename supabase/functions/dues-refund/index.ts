// dues-refund — admin-only refund against a specific dues_payments row.
// Body: { payment_id, amount_pence?, note? }
// Uses Stripe SANDBOX explicitly.

import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing auth" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc("has_role" as any, { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const paymentId: string = body.payment_id;
    const amountPence: number | undefined = body.amount_pence;
    const note: string | undefined = body.note;
    if (!paymentId) return json({ error: "payment_id required" }, 400);

    const { data: payment } = await admin
      .from("dues_payments")
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();
    if (!payment) return json({ error: "Payment not found" }, 404);
    if ((payment as any).type !== "payment") return json({ error: "Can only refund payment rows" }, 400);
    if (!(payment as any).stripe_payment_intent_id) return json({ error: "No payment_intent on this row" }, 400);

    const pi = (payment as any).stripe_payment_intent_id as string;
    const originalAmount = (payment as any).amount_pence as number;

    // Compute refundable balance = original - already refunded (successful only)
    const { data: priorRefunds } = await admin
      .from("dues_payments")
      .select("amount_pence,status")
      .eq("subscription_id", (payment as any).subscription_id)
      .eq("stripe_payment_intent_id", pi)
      .eq("type", "refund");
    const alreadyRefunded = (priorRefunds ?? [])
      .filter((r: any) => r.status !== "failed")
      .reduce((s: number, r: any) => s + (r.amount_pence ?? 0), 0);
    const refundable = originalAmount - alreadyRefunded;
    const requested = amountPence && amountPence > 0 ? amountPence : refundable;
    if (requested > refundable) return json({ error: `Only ${refundable}p refundable` }, 400);

    const stripe = createStripeClient("sandbox");
    const refund = await stripe.refunds.create({
      payment_intent: pi,
      amount: requested,
      metadata: {
        kind: "dues",
        dues_subscription_id: (payment as any).subscription_id,
        dues_payment_id: paymentId,
      },
    });

    // Bacs refunds arrive with status 'pending' and settle later.
    const { error: insErr } = await admin.from("dues_payments").insert({
      subscription_id: (payment as any).subscription_id,
      member_id: (payment as any).member_id,
      type: "refund",
      amount_pence: requested,
      method: (payment as any).method,
      stripe_payment_intent_id: pi,
      stripe_charge_id: (payment as any).stripe_charge_id ?? refund.charge ?? null,
      stripe_refund_id: refund.id,
      status: refund.status === "succeeded" ? "succeeded" : (refund.status ?? "pending"),
      note: note ?? "Manual refund by admin",
      occurred_at: new Date().toISOString(),
    });
    if (insErr) throw insErr;

    return json({
      ok: true,
      refund_id: refund.id,
      status: refund.status,
      amount_pence: requested,
      environment: "sandbox",
    });
  } catch (e) {
    console.error("dues-refund error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
