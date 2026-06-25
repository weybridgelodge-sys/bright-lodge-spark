import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";
import { sendBookingEmails } from "../_shared/send-booking-emails.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const bookingId = session.metadata?.booking_id;
  if (!bookingId) {
    console.warn("checkout.session.completed without booking_id metadata", session.id);
    return;
  }
  const { error } = await getSupabase()
    .from("bookings")
    .update({
      payment_status: "paid",
      stripe_payment_intent_id: session.payment_intent ?? null,
      paid_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("environment", env);
  if (error) console.error("Failed to mark booking paid:", error);
}

async function handlePaymentFailed(intent: any, env: StripeEnv) {
  // PaymentIntent doesn't carry our booking_id directly; look up by id.
  const { error } = await getSupabase()
    .from("bookings")
    .update({ payment_status: "failed" })
    .eq("stripe_payment_intent_id", intent.id)
    .eq("environment", env);
  if (error) console.error("Failed to mark booking failed:", error);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook with invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;

  try {
    const event = await verifyWebhook(req, env);
    switch (event.type) {
      case "checkout.session.completed":
      case "transaction.completed":
        await handleCheckoutCompleted(event.data.object, env);
        break;
      case "checkout.session.async_payment_failed":
      case "transaction.payment_failed":
        await handlePaymentFailed(event.data.object, env);
        break;
      default:
        console.log("Unhandled webhook event:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
