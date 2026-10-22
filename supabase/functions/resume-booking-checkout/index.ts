// Resume payment for the signed-in member's OWN pending card booking.
// Never inserts a booking. Reuses the open Stripe session when it is still
// valid; only if the booking has no session yet does it create one for the
// same stored amount, with a Stripe idempotency key and a guarded update.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { HOLD_MINUTES } from "../_shared/pendingBookingExpiry.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const Body = z.object({ booking_id: z.string().uuid(), return_url: z.string().url() });
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
    const { data: u } = token ? await supabase.auth.getUser(token) : { data: null };
    const uid = u?.user?.id;
    if (!uid) return json({ error: "Please sign in." }, 401);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid request." }, 400);
    const { booking_id, return_url } = parsed.data;

    const [{ data: b }, { data: prof }] = await Promise.all([
      supabase.from("bookings").select("id,user_id,contact_email,payment_status,details,line_items,fee_pence,total_pence,stripe_session_id,created_at,environment,event_key,event_label").eq("id", booking_id).maybeSingle(),
      supabase.from("profiles").select("email").eq("id", uid).maybeSingle(),
    ]);
    const email = (prof?.email ?? "").trim().toLowerCase();
    const owns = b && (b.user_id === uid || (!!email && (b.contact_email ?? "").trim().toLowerCase() === email));
    if (!b || !owns) return json({ error: "Booking not found." }, 404);
    if (b.payment_status === "paid") return json({ state: "paid" });
    const isCard = !!b.stripe_session_id || (b.details as Record<string, unknown> | null)?.paymentMethod === "card";
    if (b.payment_status !== "pending" || !isCard) return json({ state: "not_resumable" });

    const holdEnd = new Date(b.created_at).getTime() + HOLD_MINUTES * 60_000;
    if (Date.now() >= holdEnd) return json({ state: "released" });
    const env = (b.environment === "sandbox" ? "sandbox" : "live") as StripeEnv;
    const stripe = createStripeClient(env);

    if (b.stripe_session_id) {
      const s = await stripe.checkout.sessions.retrieve(b.stripe_session_id);
      if (s.payment_status === "paid") return json({ state: "paid" });
      if (s.status === "open" && s.client_secret && (s.expires_at ?? 0) * 1000 > Date.now()) {
        return json({ state: "open", clientSecret: s.client_secret, totalPence: b.total_pence });
      }
      // Session closed/expired and unpaid: the hold is gone; the hourly cleanup releases it.
      return json({ state: "released" });
    }

    // No session was ever attached. Stripe needs >= 30 min to expiry.
    const expiresAt = Math.floor(holdEnd / 1000);
    if (expiresAt - Date.now() / 1000 < 30 * 60 + 30) return json({ state: "released" });
    const items = ((b.line_items ?? []) as { label: string; qty: number; unit_price_pence: number }[]).map((li) => ({
      price_data: { currency: "gbp", product_data: { name: li.label.slice(0, 250) }, unit_amount: li.unit_price_pence }, quantity: li.qty,
    }));
    if ((b.fee_pence ?? 0) > 0) items.push({ price_data: { currency: "gbp", product_data: { name: "Card processing fee" }, unit_amount: b.fee_pence }, quantity: 1 });
    const session = await stripe.checkout.sessions.create({
      line_items: items, mode: "payment", ui_mode: "embedded_page", return_url, expires_at: expiresAt,
      customer_email: b.contact_email,
      payment_intent_data: { description: `${b.event_label} — booking ${b.id.slice(0, 8)}`, receipt_email: b.contact_email },
      metadata: { booking_id: b.id, event_key: b.event_key, userId: uid },
    }, { idempotencyKey: `resume-${b.id}` });
    const { data: upd } = await supabase.from("bookings").update({ stripe_session_id: session.id })
      .eq("id", b.id).is("stripe_session_id", null).select("id");
    if (!upd?.length) {
      // A parallel tap attached a session first; use that one.
      const { data: again } = await supabase.from("bookings").select("stripe_session_id").eq("id", b.id).maybeSingle();
      if (again?.stripe_session_id && again.stripe_session_id !== session.id) {
        await stripe.checkout.sessions.expire(session.id).catch(() => {});
        const s = await stripe.checkout.sessions.retrieve(again.stripe_session_id);
        return s.status === "open" ? json({ state: "open", clientSecret: s.client_secret, totalPence: b.total_pence }) : json({ state: "released" });
      }
    }
    return json({ state: "open", clientSecret: session.client_secret, totalPence: b.total_pence });
  } catch (e) {
    console.error("resume-booking-checkout error:", e instanceof Error ? e.message : "unknown");
    return json({ error: "Payment could not be resumed. Please try again." }, 500);
  }
});
