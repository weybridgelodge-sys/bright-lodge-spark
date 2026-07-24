// dues-create-checkout — creates a Stripe Checkout Session (TEST/SANDBOX only)
// for a member's annual dues arrangement. Admin-only for the committee demo.
//
// Body: { member_id, plan: 'lump_sum'|'monthly', method: 'card'|'bacs' }
// Returns: { url, sub_id }

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
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc("has_role" as any, {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Admin only (test-mode demo)" }, 403);

    const body = await req.json().catch(() => ({}));
    const memberId: string = body.member_id ?? user.id;
    const plan: "lump_sum" | "monthly" = body.plan;
    const method: "card" | "bacs" = body.method;
    const returnUrl: string = body.return_url ?? "https://weybridgelodge.org.uk/members/admin/dues?checkout=complete";

    if (!["lump_sum", "monthly"].includes(plan)) return json({ error: "Invalid plan" }, 400);
    if (!["card", "bacs"].includes(method)) return json({ error: "Invalid method" }, 400);

    // Load member + current settings
    const { data: profile } = await admin
      .from("profiles")
      .select("id,email,full_name,first_name,last_name")
      .eq("id", memberId)
      .maybeSingle();
    if (!profile) return json({ error: "Member not found" }, 404);

    const { data: yearRow } = await admin.rpc("current_lodge_year" as any);
    const lodgeYear = Number(yearRow);

    // Compute prorated / exempt amount via shared DB function
    const { data: calc, error: calcErr } = await admin.rpc("dues_calculate_amount" as any, {
      _member_id: memberId,
      _lodge_year: lodgeYear,
    });
    if (calcErr) return json({ error: `Calc failed: ${calcErr.message}` }, 400);
    const c = calc as any;
    const annual = c?.final_pence as number;
    if (annual === undefined || annual === null) return json({ error: "No dues_settings configured" }, 400);
    if (c?.is_exempt) {
      return json({ error: `Member is exempt (${c.exempt_reason}) — no checkout required.` }, 400);
    }
    if (annual <= 0) {
      return json({ error: "Calculated amount is £0 — no checkout required." }, 400);
    }

    // ALWAYS SANDBOX for this demo
    const stripe = createStripeClient("sandbox");

    // Upsert dues_subscriptions row
    const { data: existing } = await admin
      .from("dues_subscriptions")
      .select("id,stripe_customer_id")
      .eq("member_id", memberId)
      .eq("lodge_year", lodgeYear)
      .maybeSingle();

    let subRowId: string;
    let stripeCustomerId: string | null = (existing as any)?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: (profile as any).email ?? undefined,
        name: (profile as any).full_name ?? undefined,
        metadata: { member_id: memberId, kind: "dues" },
      });
      stripeCustomerId = customer.id;
    }

    if (existing) {
      subRowId = (existing as any).id;
      await admin.from("dues_subscriptions").update({
        plan, method, amount_pence: annual, status: "setup",
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: null,
        stripe_payment_intent_id: null,
        stripe_checkout_session_id: null,
      }).eq("id", subRowId);
    } else {
      const { data: inserted, error } = await admin.from("dues_subscriptions").insert({
        member_id: memberId,
        lodge_year: lodgeYear,
        plan, method, amount_pence: annual, status: "setup",
        stripe_customer_id: stripeCustomerId,
      }).select("id").single();
      if (error) throw error;
      subRowId = (inserted as any).id;
    }

    const paymentMethodTypes = method === "bacs" ? ["bacs_debit"] : ["card"];
    const metadata = { kind: "dues", dues_subscription_id: subRowId, member_id: memberId, lodge_year: String(lodgeYear) };

    let sessionUrl: string | null = null;
    if (plan === "lump_sum") {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: stripeCustomerId,
        payment_method_types: paymentMethodTypes as any,
        line_items: [{
          price_data: {
            currency: "gbp",
            product_data: { name: `Weybridge Lodge annual subscription ${lodgeYear}/${lodgeYear + 1}` },
            unit_amount: annual,
          },
          quantity: 1,
        }],
        success_url: `${returnUrl}&status=success`,
        cancel_url: `${returnUrl}&status=cancel`,
        metadata,
        payment_intent_data: { metadata },
      });
      sessionUrl = session.url;
    } else {
      const monthly = Math.round(annual / 12);
      const price = await stripe.prices.create({
        currency: "gbp",
        unit_amount: monthly,
        recurring: { interval: "month" },
        product_data: { name: `Weybridge Lodge monthly subscription (${lodgeYear}/${lodgeYear + 1})` },
      });
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: stripeCustomerId,
        payment_method_types: paymentMethodTypes as any,
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: `${returnUrl}&status=success`,
        cancel_url: `${returnUrl}&status=cancel`,
        metadata,
        subscription_data: {
          metadata,
          description: `Weybridge Lodge dues (12 monthly instalments)`,
        },
      });
      sessionUrl = session.url;
      await admin.from("dues_subscriptions").update({ stripe_price_id: price.id }).eq("id", subRowId);
    }

    return json({ url: sessionUrl, sub_id: subRowId, environment: "sandbox" });
  } catch (e) {
    console.error("dues-create-checkout error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
