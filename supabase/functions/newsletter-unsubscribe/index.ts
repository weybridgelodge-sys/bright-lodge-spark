import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function buildHtmlHeaders() {
  const headers = new Headers();
  for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
  headers.set("Content-Type", "text/html; charset=utf-8");
  // Prevent mobile browsers (notably Samsung Internet / in-app WebViews) from
  // MIME-sniffing short responses as text/plain and rendering the source.
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "no-store");
  return headers;
}

// Supabase's Edge gateway currently preserves our other headers on non-2xx
// responses but coerces Content-Type to text/plain. These links are opened by
// people in mobile browsers, so even error states must be 200 HTML pages rather
// than 4xx HTML responses or Samsung Internet renders the markup as source.
function htmlResponse(title: string, message: string) {
  return new Response(new TextEncoder().encode(page(title, message)), {
    status: 200,
    headers: buildHtmlHeaders(),
  });
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function page(title: string, message: string) {
  // Notes on encoding:
  // - Uppercase DOCTYPE + <meta charset> is the very first head child so
  //   pre-scan browsers (Samsung Internet, Android WebView) latch UTF-8 before
  //   any multi-byte body content.
  // - All punctuation that isn't 7-bit ASCII (em dash, curly apostrophes) is
  //   emitted as HTML entities. This is immune to charset mis-detection or
  //   downstream proxies that re-encode payload bytes.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} &mdash; Weybridge Lodge No.&nbsp;6787</title>
<style>
body{margin:0;font-family:Inter,system-ui,sans-serif;background:#0c1730;color:#f6f1e2;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.card{max-width:520px;background:#152244;border:1px solid rgba(201,164,50,.25);border-radius:16px;padding:40px;text-align:center}
h1{font-family:'Playfair Display',Georgia,serif;color:#C9A432;margin:0 0 12px;font-size:28px}
p{line-height:1.6;color:rgba(246,241,226,.85);margin:0 0 8px}
a{color:#C9A432;text-decoration:none;font-weight:600}
.note{font-size:12px;color:rgba(246,241,226,.6);margin-top:18px}
</style>
</head>
<body><div class="card"><h1>${title}</h1><p>${message}</p><p class="note">This covers newsletter mailings and meeting invitations sent to visiting Freemasons. Official lodge communications (summonses to members, booking confirmations and portal notifications) are unaffected.</p><p style="margin-top:18px"><a href="https://weybridgelodge.org.uk">Return to Weybridge Lodge</a></p></div></body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return htmlResponse("Invalid link", "This unsubscribe link is missing a token.");
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
    return htmlResponse(
      "You&rsquo;re unsubscribed",
      `<strong>${profile?.email ?? "Your account"}</strong> has been removed from future Weybridge Lodge emails (newsletter and meeting invitations).`,
    );
  }

  // 2. Visiting Freemasons (festive board contacts).
  const { data: visitor } = await supabase
    .from("visitor_contacts")
    .update({ opted_out_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("email")
    .maybeSingle();
  if (visitor) {
    return htmlResponse(
      "You&rsquo;re unsubscribed",
      `<strong>${visitor.email}</strong> has been removed from future Weybridge Lodge emails (newsletter and meeting invitations). We&rsquo;re sorry to see you go.`,
    );
  }

  // 3. Fall back to the public subscriber list.
  const { data: sub } = await supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("email")
    .maybeSingle();
  if (sub) {
    return htmlResponse(
      "You&rsquo;re unsubscribed",
      `<strong>${sub.email}</strong> has been removed from future Weybridge Lodge emails (newsletter and meeting invitations). We&rsquo;re sorry to see you go.`,
    );
  }

  return htmlResponse("Link not recognised", "We couldn&rsquo;t find a matching subscription. It may have already been removed.");
});
