// dues-apply-price-change — admin action. Applies a scheduled dues_settings
// row to every active monthly Stripe subscription. Only permitted once ≥10
// working days have passed since notice_sent_at (DD Guarantee). Uses SANDBOX.
//
// Body: { settings_id, force?: boolean }  // force bypasses notice-period check (demo only)

import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Add N UK working days (Mon-Fri; bank holidays not modelled — demo only)
function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

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

    const { settings_id, force } = await req.json().catch(() => ({}));
    if (!settings_id) return json({ error: "settings_id required" }, 400);

    const { data: setting } = await admin
      .from("dues_settings")
      .select("*")
      .eq("id", settings_id)
      .maybeSingle();
    if (!setting) return json({ error: "Setting not found" }, 404);
    if ((setting as any).applied_at) return json({ error: "Already applied" }, 400);

    const noticeSent = (setting as any).notice_sent_at as string | null;
    if (!noticeSent && !force) return json({ error: "Notice must be sent before applying" }, 400);
    if (noticeSent && !force) {
      const earliest = addWorkingDays(new Date(noticeSent), 10);
      if (new Date() < earliest) {
        return json({
          error: `Notice period not elapsed. Earliest apply: ${earliest.toISOString()}`,
          earliest_apply_at: earliest.toISOString(),
        }, 400);
      }
    }

    const newAnnual = (setting as any).annual_amount_pence as number;
    const monthly = Math.round(newAnnual / 12);
    const stripe = createStripeClient("sandbox");

    // Fetch active monthly subs
    const { data: subs } = await admin
      .from("dues_subscriptions")
      .select("id, member_id, stripe_subscription_id")
      .eq("plan", "monthly")
      .in("status", ["active", "past_due"]);

    let updated = 0;
    const failures: { sub_id: string; error: string }[] = [];
    for (const s of subs ?? []) {
      const stripeSubId = (s as any).stripe_subscription_id as string | null;
      if (!stripeSubId) continue;
      try {
        // Create new price and swap item
        const newPrice = await stripe.prices.create({
          currency: "gbp",
          unit_amount: monthly,
          recurring: { interval: "month" },
          product_data: { name: `Weybridge Lodge monthly subscription (effective LY ${(setting as any).effective_lodge_year})` },
        });
        const existing = await stripe.subscriptions.retrieve(stripeSubId);
        const itemId = existing.items.data[0].id;
        await stripe.subscriptions.update(stripeSubId, {
          items: [{ id: itemId, price: newPrice.id }],
          proration_behavior: "none",
          metadata: { ...existing.metadata, dues_price_updated_settings_id: settings_id },
        });
        await admin.from("dues_subscriptions").update({
          amount_pence: newAnnual,
          stripe_price_id: newPrice.id,
          updated_at: new Date().toISOString(),
        }).eq("id", (s as any).id);
        updated++;
      } catch (e) {
        failures.push({ sub_id: (s as any).id, error: (e as Error).message });
      }
    }

    await admin.from("dues_settings").update({ applied_at: new Date().toISOString() }).eq("id", settings_id);
    return json({ ok: true, updated, total: subs?.length ?? 0, failures, environment: "sandbox" });
  } catch (e) {
    console.error("dues-apply-price-change error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
