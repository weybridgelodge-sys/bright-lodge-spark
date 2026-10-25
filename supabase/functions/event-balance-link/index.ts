import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { balanceUrl, ensureBalanceToken, regenerateBalanceToken, sendEventBookingEmails, serviceClient } from "../_shared/stripe-events.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const Body = z.object({ booking_id: z.string().uuid(), action: z.enum(["get", "resend", "regenerate"]) });

/** Admin / current Treasurer may do everything; Admin or current Secretary may copy and resend. */
async function callerRights(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser(auth.slice(7));
  if (!u?.user) return null;
  const [a, t, s] = await Promise.all([
    sb.rpc("has_role", { _user_id: u.user.id, _role: "admin" }),
    sb.rpc("is_current_officer", { _user_id: u.user.id, _position_key: "treasurer" }),
    sb.rpc("is_lodge_secretary", { _user: u.user.id }),
  ]);
  const treasurer = a.data === true || t.data === true;
  return { treasurer, resend: treasurer || s.data === true };
}

// Staff: copy (same link every time), resend, or regenerate a booking's balance link.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const rights = await callerRights(req);
  if (!rights?.resend) return json({ error: "Not authorised" }, 403);
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return json({ error: "Invalid request" }, 400);
  if (p.data.action === "regenerate" && !rights.treasurer) return json({ error: "Only the Treasurer or an admin can regenerate links" }, 403);
  const sb = serviceClient();
  const { data: b } = await sb.from("event_bookings").select("id,payment_status,payment_plan,contact_email").eq("id", p.data.booking_id).maybeSingle();
  if (!b || (b.payment_status !== "deposit_paid" && b.payment_status !== "paid")) return json({ error: "This booking has no balance link" }, 404);
  try {
    const token = p.data.action === "regenerate" ? await regenerateBalanceToken(sb, b.id) : await ensureBalanceToken(sb, b.id);
    if (p.data.action === "resend") {
      if (!b.contact_email) return json({ error: "This booking has no email address" }, 400);
      const r = await sendEventBookingEmails(sb, b.id, "link", { idempotencySuffix: String(Date.now()) });
      if (!r.ok) return json({ error: "The email could not be sent" }, 502);
    }
    return json({ url: await balanceUrl(token) });
  } catch (e) {
    console.error("event-balance-link error", e);
    return json({ error: "Something went wrong" }, 500);
  }
});
