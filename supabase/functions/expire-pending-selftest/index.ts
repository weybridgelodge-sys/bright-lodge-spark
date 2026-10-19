// TEMPORARY test-mode self-check for expire-pending-bookings. Sandbox Stripe
// only, no emails, cleans up after itself. Deleted after the run.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient } from "../_shared/stripe.ts";
import { processPendingBooking } from "../_shared/processPendingBooking.ts";

const MEETING = "569000ca-0ce1-4e15-a2bf-53053ca70c74";
const EVENT_KEY = "selftest-expiry"; // no lodge_events row → no waitlist promotion

Deno.serve(async () => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const stripe = createStripeClient("sandbox");
  const out: Record<string, unknown> = {};
  const regCount = async (id: string) => {
    const { count } = await sb.from("festive_board_attendance").select("id", { count: "exact", head: true })
      .or(`source_booking_id.eq.${id},source_booking_id.like.${id}::g*,booking_id.eq.${id}`);
    return count ?? 0;
  };
  const mk = async () => {
    const { data, error } = await sb.from("bookings").insert({
      event_key: EVENT_KEY, meeting_id: MEETING, event_label: "Selftest", contact_name: "Selftest Person",
      contact_email: "julientidmarsh@pm.me", line_items: [{ label: "Dining", qty: 1, unit_price_pence: 100 }],
      details: { paymentMethod: "card", lodge: "Selftest Lodge 999", firstName: "Selftest", lastName: "Person", meetingOption: "meeting-and-festive-board" },
      subtotal_pence: 100, fee_pence: 0, total_pence: 100, currency: "gbp", payment_status: "pending", environment: "sandbox",
    }).select().single();
    if (error) throw error;
    return data as any;
  };
  const ids: string[] = [];
  try {
    // A: session expires, unpaid → removed, never on register
    const a = await mk(); ids.push(a.id);
    out.a_register_after_insert = await regCount(a.id);
    const s = await stripe.checkout.sessions.create({
      mode: "payment", ui_mode: "embedded_page", return_url: "https://example.com/r?session_id={CHECKOUT_SESSION_ID}",
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60, metadata: { booking_id: a.id },
      line_items: [{ price_data: { currency: "gbp", product_data: { name: "Selftest" }, unit_amount: 100 }, quantity: 1 }],
    });
    out.a_session_expires_in_min = Math.round((s.expires_at - Date.now() / 1000) / 60);
    await sb.from("bookings").update({ stripe_session_id: s.id }).eq("id", a.id);
    const a2 = { ...a, stripe_session_id: s.id };
    out.a_within_hour = await processPendingBooking(sb, stripe, a2, "sandbox", new Date(), false);
    await stripe.checkout.sessions.expire(s.id);
    const created = new Date(a.created_at).getTime();
    out.a_inside_grace = await processPendingBooking(sb, stripe, a2, "sandbox", new Date(created + 70 * 60000), false);
    out.a_after_grace = await processPendingBooking(sb, stripe, a2, "sandbox", new Date(created + 76 * 60000), false);
    const { data: gone } = await sb.from("bookings").select("id").eq("id", a.id).maybeSingle();
    out.a_row_exists_after = !!gone;
    out.a_register_after = await regCount(a.id);

    // B: Stripe reports paid inside the grace window → kept and marked paid
    const b = await mk(); ids.push(b.id);
    out.b_register_while_pending = await regCount(b.id);
    const fake = { id: "cs_test_selftest", status: "complete", payment_status: "paid", expires_at: Math.floor(Date.now() / 1000) - 60, payment_intent: null, metadata: { booking_id: b.id } };
    out.b_run = await processPendingBooking(sb, stripe, { ...b, stripe_session_id: "cs_test_selftest" }, "sandbox",
      new Date(new Date(b.created_at).getTime() + 70 * 60000), false, { sendEmails: false, sessionOverride: fake });
    const { data: bAfter } = await sb.from("bookings").select("payment_status").eq("id", b.id).single();
    out.b_status_after = (bAfter as any).payment_status;
    out.b_register_after_paid = await regCount(b.id);
    await sb.from("bookings").update({ payment_status: "paid" }).eq("id", b.id); // second paid update
    out.b_register_after_second_paid = await regCount(b.id);
  } catch (e) {
    out.error = (e as Error).message;
  } finally {
    for (const id of ids) {
      await sb.from("festive_board_attendance").delete().or(`source_booking_id.eq.${id},source_booking_id.like.${id}::g*,booking_id.eq.${id}`);
      await sb.from("bookings").delete().eq("id", id);
    }
    const { count } = await sb.from("bookings").select("id", { count: "exact", head: true }).eq("event_key", EVENT_KEY);
    out.cleanup_remaining = count;
  }
  return new Response(JSON.stringify(out, null, 2), { headers: { "Content-Type": "application/json" } });
});
