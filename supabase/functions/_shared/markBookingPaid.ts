// Single "booking paid" path, shared by payments-webhook and the
// pending-booking expiry job so a payment found by either is handled the same.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { StripeEnv } from "./stripe.ts";
import { syncBookingStripeFee } from "./stripe-fees.ts";
import { sendBookingEmails } from "./send-booking-emails.ts";

export async function markBookingPaid(
  supabase: SupabaseClient,
  session: { id?: string; payment_intent?: string | null; metadata?: Record<string, string> | null },
  env: StripeEnv,
  opts: { sendEmails?: boolean } = {},
): Promise<"paid" | "already_paid" | "not_found" | "error"> {
  const bookingId = session.metadata?.booking_id;
  if (!bookingId) return "not_found";
  const { data: existing } = await supabase
    .from("bookings")
    .select("payment_status")
    .eq("id", bookingId)
    .eq("environment", env)
    .maybeSingle();
  if (!existing) {
    console.error("Paid checkout session has no booking row", { session: session.id, bookingId });
    return "not_found";
  }
  const status = (existing as { payment_status: string }).payment_status;
  // Idempotent: webhook and expiry job may both see the same payment.
  if (["paid", "refunded", "waitlisted_refunded", "apologies"].includes(status)) return "already_paid";
  const isWaitlisted = status === "waitlisted";
  const { error } = await supabase
    .from("bookings")
    .update({
      payment_status: isWaitlisted ? "waitlisted" : "paid",
      stripe_payment_intent_id: session.payment_intent ?? null,
      paid_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("environment", env);
  if (error) {
    console.error("Failed to mark booking paid:", error);
    return "error";
  }
  await syncBookingStripeFee(supabase, bookingId, session.payment_intent, env, { attempts: 2, retryDelayMs: 3000 });
  if (opts.sendEmails !== false) {
    try {
      await sendBookingEmails(bookingId, { stage: "paid" });
    } catch (e) {
      console.error("sendBookingEmails (paid) failed:", e);
    }
  }
  return "paid";
}
