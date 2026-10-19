import { createClient } from "npm:@supabase/supabase-js@2";
import { bookingFirstName } from "../_shared/greeting.ts";
import { createStripeClient } from "../_shared/stripe.ts";
import { envFromSessionId, isSessionExpiredForReturn } from "../_shared/pendingBookingExpiry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [user, domain] = email.split("@");
  if (!domain) return null;
  const visible = user.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(1, user.length - 1))}@${domain}`;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { session_id } = await req.json();
    if (!session_id || typeof session_id !== "string" || session_id.length < 20 || session_id.length > 200) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data, error } = await supabase
      .from("bookings")
      .select("id, contact_name, details, contact_email, event_label, subtotal_pence, fee_pence, total_pence, payment_status, paid_at")
      .eq("stripe_session_id", session_id)
      .maybeSingle();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitised = data
      ? {
          id: data.id,
          contact_name: bookingFirstName(data.details as Record<string, unknown> | null, data.contact_name) || null,
          contact_email: maskEmail(data.contact_email),
          event_label: data.event_label,
          subtotal_pence: data.subtotal_pence,
          fee_pence: data.fee_pence,
          total_pence: data.total_pence,
          payment_status: data.payment_status,
          paid_at: data.paid_at,
        }
      : null;

    // Unpaid hold lapsed (or the row has been cleared): tell the return page.
    let sessionExpired = false;
    if (!data || data.payment_status === "pending") {
      const env = envFromSessionId(session_id);
      if (env) {
        try {
          const s = await createStripeClient(env).checkout.sessions.retrieve(session_id);
          sessionExpired = isSessionExpiredForReturn(data?.payment_status ?? null,
            { status: s.status, payment_status: s.payment_status, expires_at: s.expires_at }, new Date());
        } catch (_e) { /* unknown session: leave as not found */ }
      }
    }

    return new Response(JSON.stringify({ booking: sessionExpired ? null : sanitised, session_expired: sessionExpired }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
