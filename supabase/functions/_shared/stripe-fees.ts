import { createStripeClient, type StripeEnv } from "./stripe.ts";

/**
 * Fetch the actual Stripe processing fee for a booking's payment intent and
 * store it on the booking. Retries once (after `retryDelayMs`) when Stripe has
 * not yet attached the balance_transaction — that attachment can lag a few
 * seconds behind checkout completion.
 *
 * Never throws: callers (webhook + scheduled backfill) must not fail over
 * fee capture.
 */
export async function syncBookingStripeFee(
  supabase: any,
  bookingId: string,
  paymentIntentId: string | null | undefined,
  env: StripeEnv,
  opts: { attempts?: number; retryDelayMs?: number } = {},
): Promise<boolean> {
  if (!paymentIntentId) return false;
  const attempts = opts.attempts ?? 2;
  const retryDelayMs = opts.retryDelayMs ?? 3000;

  try {
    const stripe = createStripeClient(env);

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge.balance_transaction"],
      });
      const charge: any = (pi as any).latest_charge;
      const bt: any = charge?.balance_transaction;

      if (!bt || typeof bt === "string") {
        if (attempt < attempts) {
          console.warn(
            `balance_transaction not ready for ${paymentIntentId} (attempt ${attempt}), retrying in ${retryDelayMs}ms`,
          );
          await new Promise((r) => setTimeout(r, retryDelayMs));
          continue;
        }
        console.warn("No expanded balance_transaction for", paymentIntentId);
        return false;
      }

      const { error } = await supabase
        .from("bookings")
        .update({
          stripe_fee_pence: bt.fee ?? null,
          stripe_net_pence: bt.net ?? null,
          stripe_balance_transaction_id: bt.id ?? null,
        })
        .eq("id", bookingId)
        .eq("environment", env);
      if (error) {
        console.error("Failed to store Stripe fee:", error);
        return false;
      }
      return true;
    }
    return false;
  } catch (e) {
    // Never fail the caller over fee capture — reconciliation can be manual.
    console.error("syncBookingStripeFee failed:", bookingId, e);
    return false;
  }
}
