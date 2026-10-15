import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";
import { methodLabel, serviceClient } from "../_shared/stripe-events.ts";

const Body = z.object({ reference: z.string().max(40), token: z.string().uuid() });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return json({ error: "Invalid request" }, 400);
  const sb = serviceClient();
  const { data: b } = await sb.from("event_bookings")
    .select("reference,payer_name,adult_count,child_count,subtotal_pence,fee_pence,total_pence,payment_method,payment_status,bank_instructions,event_id,id,items_subtotal_pence")
    .eq("reference", p.data.reference).eq("access_token", p.data.token).maybeSingle();
  if (!b) return json({ error: "Booking not found" }, 404);
  const [{ data: items }, { data: guests }] = await Promise.all([
    sb.from("event_booking_items").select("name_snapshot,quantity,unit_price_pence").eq("booking_id", b.id).order("created_at"),
    sb.from("event_guests").select("name,menu_choice").eq("booking_id", b.id).not("menu_choice", "is", null),
  ]);
  return json({
    reference: b.reference, name: b.payer_name, adults: b.adult_count, children: b.child_count,
    subtotal_pence: b.subtotal_pence ?? b.total_pence, fee_pence: b.fee_pence ?? 0, total_pence: b.total_pence, payment_method: methodLabel(b.payment_method), payment_status: b.payment_status,
    items: (items ?? []).map((i: any) => ({ name: i.name_snapshot, qty: i.quantity, unit_pence: i.unit_price_pence })),
    menus: (guests ?? []).map((g: any) => ({ name: g.name, menu: g.menu_choice })),
    bank: b.payment_status === "paid" ? null : b.bank_instructions,
  });
});
