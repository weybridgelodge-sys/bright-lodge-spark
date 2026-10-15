import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";
import { serviceClient, syncEventBookingFees } from "../_shared/stripe-events.ts";
import { isEventsTreasurer } from "../_shared/events-treasurer-auth.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const Body = z.object({ event_id: z.string().uuid() });

// Fetch actual Stripe fees for paid bookings on one event that are still missing them. Treasurer/admin only.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await isEventsTreasurer(req))) return json({ error: "Not authorised" }, 403);
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return json({ error: "Invalid request" }, 400);
  const sb = serviceClient();
  // Per payment: deposits and balances each have their own Stripe charge.
  const { data: bks } = await sb.from("event_bookings").select("id").eq("event_id", p.data.event_id);
  const ids = (bks ?? []).map((b: any) => b.id);
  const { data } = ids.length ? await sb.from("event_booking_payments").select("booking_id,stripe_payment_intent_id")
    .in("booking_id", ids).in("status", ["paid", "refunded"]).is("stripe_fee_pence", null).not("stripe_payment_intent_id", "is", null) : { data: [] as any[] };
  let updated = 0;
  for (const b of data ?? []) if (await syncEventBookingFees(sb, b.booking_id, b.stripe_payment_intent_id, { attempts: 1 })) updated++;
  return json({ checked: data?.length ?? 0, updated });
});
