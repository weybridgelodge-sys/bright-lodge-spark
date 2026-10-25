// Dependency-free core of markBookingPaid (testable without Stripe or email libraries).
import { type RunAfterReply, runAfterReply, runInline } from "./afterReply.ts";

export type MarkPaidResult = "paid" | "already_paid" | "not_found" | "error";
export const ALREADY_DONE = ["paid", "refunded", "waitlisted_refunded", "apologies"];

export interface MarkBookingPaidDeps {
  syncFee: (bookingId: string, paymentIntentId: string | null | undefined) => Promise<unknown>;
  sendPaidEmails: (bookingId: string) => Promise<unknown>;
}

export interface MarkBookingPaidOpts {
  sendEmails?: boolean;
  /** "await" (default; expiry job): fee + emails finish before returning.
   *  "after_reply" (payments-webhook): fee + emails run after the 200 via EdgeRuntime.waitUntil. */
  followUp?: "await" | "after_reply";
  /** Test hook only. */
  runner?: RunAfterReply;
}

export async function markBookingPaidWith(
  supabase: any,
  session: { id?: string; payment_intent?: string | null; metadata?: Record<string, string> | null },
  env: string,
  opts: MarkBookingPaidOpts,
  deps: MarkBookingPaidDeps,
): Promise<MarkPaidResult> {
  const bookingId = session.metadata?.booking_id;
  if (!bookingId) return "not_found";
  const { data: existing } = await supabase
    .from("bookings").select("payment_status").eq("id", bookingId).eq("environment", env).maybeSingle();
  if (!existing) {
    console.error("Paid checkout session has no booking row", { session: session.id, bookingId });
    return "not_found";
  }
  const status = (existing as { payment_status: string | null }).payment_status;
  // Idempotent: webhook and expiry job may both see the same payment.
  if (status != null && ALREADY_DONE.includes(status)) return "already_paid";
  const isWaitlisted = status === "waitlisted";
  // Conditional: only the delivery that still sees the status it read wins.
  let q = supabase
    .from("bookings")
    .update({
      payment_status: isWaitlisted ? "waitlisted" : "paid",
      stripe_payment_intent_id: session.payment_intent ?? null,
      paid_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("environment", env);
  q = status == null ? q.is("payment_status", null) : q.eq("payment_status", status);
  // Waitlisted rows keep status "waitlisted"; paid_at marks them paid, so guard on it too.
  if (isWaitlisted) q = q.is("paid_at", null);
  const { data: changed, error } = await q.select("id");
  if (error) {
    console.error("Failed to mark booking paid:", error);
    return "error";
  }
  if (!changed?.length) return "already_paid";

  const run = opts.runner ?? (opts.followUp === "after_reply" ? runAfterReply : runInline);
  const followUp = run(`booking-paid ${bookingId.slice(0, 8)}`, async () => {
    await deps.syncFee(bookingId, session.payment_intent);
    if (opts.sendEmails !== false) {
      try {
        await deps.sendPaidEmails(bookingId);
      } catch (e) {
        console.error("sendBookingEmails (paid) failed:", e);
      }
    }
  });
  if (opts.followUp !== "after_reply") await followUp;
  return "paid";
}
