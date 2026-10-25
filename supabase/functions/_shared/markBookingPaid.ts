// Single "booking paid" path, shared by payments-webhook and the
// pending-booking expiry job so a payment found by either is handled the same.
// Callers: payments-webhook passes followUp "after_reply" (fee + emails after the 200);
// processPendingBooking (expiry job) uses the default "await".
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { StripeEnv } from "./stripe.ts";
import { syncBookingStripeFee } from "./stripe-fees.ts";
import { sendBookingEmails } from "./send-booking-emails.ts";
import { markBookingPaidWith, type MarkBookingPaidOpts, type MarkPaidResult } from "./markBookingPaidCore.ts";

export function markBookingPaid(
  supabase: SupabaseClient,
  session: { id?: string; payment_intent?: string | null; metadata?: Record<string, string> | null },
  env: StripeEnv,
  opts: MarkBookingPaidOpts = {},
): Promise<MarkPaidResult> {
  return markBookingPaidWith(supabase, session, env, opts, {
    syncFee: (id, pi) => syncBookingStripeFee(supabase, id, pi, env, { attempts: 2, retryDelayMs: 3000 }),
    sendPaidEmails: (id) => sendBookingEmails(id, { stage: "paid" }),
  });
}
