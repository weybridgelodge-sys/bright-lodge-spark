// One pending card booking through the expiry rules (I/O side).
// Shared by the hourly job and its test-mode self-check.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { StripeEnv } from "./stripe.ts";
import { decidePendingBooking, type StripeSessionInfo } from "./pendingBookingExpiry.ts";
import { markBookingPaid } from "./markBookingPaid.ts";

type Booking = { id: string; created_at: string; stripe_session_id: string | null };

export async function processPendingBooking(
  supabase: SupabaseClient,
  stripe: any,
  b: Booking,
  env: StripeEnv,
  now: Date,
  dryRun: boolean,
  opts: { sendEmails?: boolean; sessionOverride?: any } = {},
): Promise<Record<string, unknown>> {
  const sid = b.stripe_session_id;
  let session: StripeSessionInfo | null = null;
  let raw: any = opts.sessionOverride ?? null;
  if (!raw && sid && stripe) {
    try { raw = await stripe.checkout.sessions.retrieve(sid); }
    catch (e) { console.error("Session lookup failed", b.id.slice(0, 8), (e as Error).message); }
  }
  if (raw) session = { status: raw.status, payment_status: raw.payment_status, expires_at: raw.expires_at };
  const d = decidePendingBooking({ createdAt: b.created_at, hasSessionId: !!sid, session, now });
  const entry: Record<string, unknown> = {
    id: String(b.id).slice(0, 8), env, created_at: b.created_at,
    session_status: session?.status ?? null, session_payment: session?.payment_status ?? null, ...d,
  };
  if (dryRun || d.action === "keep") return entry;

  if (d.action === "mark_paid") {
    entry.result = await markBookingPaid(supabase, raw, env, { sendEmails: opts.sendEmails });
  } else if (d.action === "expire_session" && stripe && sid) {
    // Close the payment page now; the row is removed on a later run,
    // after the grace period, once Stripe confirms it expired.
    try { await stripe.checkout.sessions.expire(sid); entry.result = "session_closed"; }
    catch (e) { entry.result = `expire_failed: ${(e as Error).message}`; }
  } else if (d.action === "delete") {
    // Status guard: a payment landing mid-run is never lost.
    const { data: still } = await supabase.from("bookings").select("payment_status").eq("id", b.id).maybeSingle();
    if ((still as any)?.payment_status !== "pending") { entry.result = "skipped_status_changed"; return entry; }
    // Register rows from before the "register only when paid" rule.
    await supabase.from("festive_board_attendance").delete()
      .eq("source", "booking")
      .or(`source_booking_id.eq.${b.id},source_booking_id.like.${b.id}::g*,booking_id.eq.${b.id}`);
    const { error: delErr, count } = await supabase.from("bookings").delete({ count: "exact" })
      .eq("id", b.id).eq("payment_status", "pending");
    entry.result = delErr ? `delete_failed: ${delErr.message}` : count ? "deleted" : "skipped_status_changed";
  }
  return entry;
}
