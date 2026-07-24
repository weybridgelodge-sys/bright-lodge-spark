import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SITE_UNSUBSCRIBE_URL = "https://weybridgelodge.org.uk/unsubscribe";

function buildRedirectHeaders(location: string) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
  headers.set("Location", location);
  headers.set("Cache-Control", "no-store");
  return headers;
}

function redirectToStatus(status: "success" | "invalid" | "not-found") {
  const url = new URL(SITE_UNSUBSCRIBE_URL);
  url.searchParams.set("status", status);
  return new Response(null, {
    status: 303,
    headers: buildRedirectHeaders(url.toString()),
  });
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return redirectToStatus("invalid");
  }

  // 1. Try the member opt-out table first (per-recipient tokens minted at send time).
  const { data: member } = await supabase
    .from("member_newsletter_opt_outs")
    .update({ opted_out_at: new Date().toISOString() })
    .eq("token", token)
    .select("user_id")
    .maybeSingle();
  if (member) {
    return redirectToStatus("success");
  }

  // 2. Visiting Freemasons (festive board contacts).
  const { data: visitor } = await supabase
    .from("visitor_contacts")
    .update({ opted_out_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("email")
    .maybeSingle();
  if (visitor) {
    return redirectToStatus("success");
  }

  // 3. Fall back to the public subscriber list.
  const { data: sub } = await supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("email")
    .maybeSingle();
  if (sub) {
    return redirectToStatus("success");
  }

  return redirectToStatus("not-found");
});
