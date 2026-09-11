// Scheduled safety net: catches bookings whose Stripe fee was never recorded
// by the payments webhook (balance_transaction not yet attached at the time).
import { createClient } from "npm:@supabase/supabase-js@2";
import { syncBookingStripeFee } from "../_shared/stripe-fees.ts";
import type { StripeEnv } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, stripe_payment_intent_id, environment")
    .eq("payment_status", "paid")
    .is("stripe_fee_pence", null)
    .not("stripe_payment_intent_id", "is", null)
    .lt("paid_at", cutoff)
    .limit(200);

  if (error) {
    console.error("backfill-stripe-fees: query failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const found = bookings?.length ?? 0;
  let backfilled = 0;

  for (const b of bookings ?? []) {
    const env = ((b as any).environment ?? "live") as StripeEnv;
    const ok = await syncBookingStripeFee(
      supabase,
      (b as any).id,
      (b as any).stripe_payment_intent_id,
      env,
      { attempts: 1 },
    );
    if (ok) backfilled++;
  }

  console.log(
    `backfill-stripe-fees: found ${found} booking(s) missing fees, backfilled ${backfilled}`,
  );

  return new Response(JSON.stringify({ found, backfilled }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
