import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { eventsStripe } from "../_shared/stripe-events.ts";
import { isEventsTreasurer } from "../_shared/events-treasurer-auth.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Live balance (available + pending, GBP) of the EVENTS Stripe account. Treasurer/admin only.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await isEventsTreasurer(req))) return json({ error: "Not authorised" }, 403);
  try {
    const bal: any = await eventsStripe().balance.retrieve();
    const sum = (arr: any[]) => (arr ?? []).filter((x) => x.currency === "gbp").reduce((s, x) => s + (x.amount ?? 0), 0);
    return json({ available_pence: sum(bal.available), pending_pence: sum(bal.pending), checked_at: new Date().toISOString(), livemode: !!bal.livemode });
  } catch (e) {
    console.error("events-stripe-balance", e);
    return json({ error: "Could not read the events Stripe balance" }, 502);
  }
});
