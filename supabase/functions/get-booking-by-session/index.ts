import { createClient } from "npm:@supabase/supabase-js@2";

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

function firstNameOnly(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.trim().split(/\s+/)[0] || null;
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
      .select("id, contact_name, contact_email, event_label, total_pence, payment_status, paid_at")
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
          contact_name: firstNameOnly(data.contact_name),
          contact_email: maskEmail(data.contact_email),
          event_label: data.event_label,
          total_pence: data.total_pence,
          payment_status: data.payment_status,
          paid_at: data.paid_at,
        }
      : null;

    return new Response(JSON.stringify({ booking: sanitised }), {
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
