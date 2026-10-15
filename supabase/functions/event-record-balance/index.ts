// Admin / current Treasurer: record a cash, cheque or other balance payment on a deposit booking.
// Adds an immutable manual payment row (with who/when) and recalculates the booking like the webhook.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { recomputeBooking, serviceClient } from "../_shared/stripe-events.ts";
import { validateManualBalance } from "../_shared/eventPricing.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const Body = z.object({
  booking_id: z.string().uuid(),
  request_id: z.string().uuid(),
  amount_pence: z.number().int().positive(),
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  manual_method: z.enum(["cash", "cheque", "other"]),
  reference: z.string().trim().max(100).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

async function caller(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser(auth.slice(7));
  if (!u?.user) return null;
  const [a, t] = await Promise.all([
    sb.rpc("has_role", { _user_id: u.user.id, _role: "admin" }),
    sb.rpc("is_current_officer", { _user_id: u.user.id, _position_key: "treasurer" }),
  ]);
  return a.data === true || t.data === true ? u.user.id : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const uid = await caller(req);
  if (!uid) return json({ error: "Only the Treasurer or an admin can record payments" }, 403);
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return json({ error: "Please check the amount, date and method" }, 400);
  const d = p.data;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  if (d.paid_at > today) return json({ error: "The date received cannot be in the future" }, 400);
  const sb = serviceClient();
  try {
    // Double-click / retry: the same request id returns the already-recorded result.
    const { data: dup } = await sb.from("event_booking_payments").select("id,booking_id").eq("request_id", d.request_id).maybeSingle();
    if (dup) {
      const { data: b } = await sb.from("event_bookings").select("payment_status,balance_due_pence").eq("id", dup.booking_id).maybeSingle();
      return json({ ok: true, duplicate: true, status: b?.payment_status, balance_due_pence: b?.balance_due_pence });
    }
    const before = await recomputeBooking(sb, d.booking_id);
    if (!before) return json({ error: "Booking not found" }, 404);
    if (before.booking.payment_plan !== "deposit" || before.booking.payment_status !== "deposit_paid") return json({ error: "This booking has no balance outstanding" }, 400);
    const v = validateManualBalance(before.balanceDue, d.amount_pence);
    if (v.ok === false) return json({ error: v.error }, 400);
    const now = new Date().toISOString();
    const { data: row, error } = await sb.from("event_booking_payments").insert({
      booking_id: d.booking_id, kind: "balance", method: "manual", manual_method: d.manual_method,
      amount_pence: d.amount_pence, fee_pence: 0, status: "paid", paid_at: `${d.paid_at}T12:00:00Z`,
      reference: d.reference || null, note: d.note || null, recorded_by: uid, recorded_at: now, request_id: d.request_id,
    }).select("id").single();
    if (error) {
      if ((error as any).code === "23505") return json({ ok: true, duplicate: true });
      throw error;
    }
    const after = await recomputeBooking(sb, d.booking_id);
    if (after && after.overpaid > 0) {
      // A simultaneous recording got there first: undo ours rather than overpay.
      await sb.from("event_booking_payments").delete().eq("id", row.id);
      await recomputeBooking(sb, d.booking_id);
      return json({ error: "The balance changed while saving. Please refresh and try again." }, 409);
    }
    console.log("event-record-balance", { booking_id: d.booking_id, payment_id: row.id, amount_pence: d.amount_pence, recorded_by: uid, recorded_at: now });
    return json({ ok: true, status: after?.status, balance_due_pence: after?.balanceDue });
  } catch (e) {
    console.error("event-record-balance error", e);
    return json({ error: "Something went wrong" }, 500);
  }
});
