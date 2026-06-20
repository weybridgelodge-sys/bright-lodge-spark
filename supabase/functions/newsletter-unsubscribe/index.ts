import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function page(title: string, message: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Weybridge Lodge No. 6787</title><style>
body{margin:0;font-family:Inter,system-ui,sans-serif;background:#0c1730;color:#f6f1e2;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.card{max-width:520px;background:#152244;border:1px solid rgba(201,164,50,.25);border-radius:16px;padding:40px;text-align:center}
h1{font-family:'Playfair Display',Georgia,serif;color:#C9A432;margin:0 0 12px;font-size:28px}
p{line-height:1.6;color:rgba(246,241,226,.85);margin:0 0 8px}
a{color:#C9A432;text-decoration:none;font-weight:600}
.note{font-size:12px;color:rgba(246,241,226,.6);margin-top:18px}
</style></head><body><div class="card"><h1>${title}</h1><p>${message}</p><p class="note">Unsubscribing only affects the Weybridge Chronicle newsletter. Official lodge communications (summonses, booking confirmations and portal notifications) are unaffected.</p><p style="margin-top:18px"><a href="https://weybridgelodge.org.uk">Return to Weybridge Lodge</a></p></div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return new Response(page("Invalid link", "This unsubscribe link is missing a token."), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 1. Try the member opt-out table first (per-recipient tokens minted at send time).
  const { data: member } = await supabase
    .from("member_newsletter_opt_outs")
    .update({ opted_out_at: new Date().toISOString() })
    .eq("token", token)
    .select("user_id")
    .maybeSingle();
  if (member) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", member.user_id)
      .maybeSingle();
    return new Response(page(
      "You're unsubscribed",
      `<strong>${profile?.email ?? "Your account"}</strong> has been removed from the Weybridge Chronicle newsletter.`,
    ), { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
  }

  // 2. Visiting Freemasons (festive board contacts).
  const { data: visitor } = await supabase
    .from("visitor_contacts")
    .update({ opted_out_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("email")
    .maybeSingle();
  if (visitor) {
    return new Response(page(
      "You're unsubscribed",
      `<strong>${visitor.email}</strong> has been removed from the Weybridge Chronicle newsletter. We're sorry to see you go.`,
    ), { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
  }

  // 3. Fall back to the public subscriber list.
  const { data: sub } = await supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("email")
    .maybeSingle();
  if (sub) {
    return new Response(page(
      "You're unsubscribed",
      `<strong>${sub.email}</strong> has been removed from the Weybridge Chronicle newsletter. We're sorry to see you go.`,
    ), { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
  }

  return new Response(page("Link not recognised", "We couldn't find a matching subscription. It may have already been removed."), {
    status: 404, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});
