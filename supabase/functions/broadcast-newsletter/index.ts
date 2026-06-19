import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
// Until a custom Resend domain is verified, sends use Resend's onboarding sender.
const FROM_ADDRESS =
  Deno.env.get("NEWSLETTER_FROM_EMAIL") ??
  "Weybridge Lodge No. 6787 <onboarding@resend.dev>";
const REPLY_TO = "communications@weybridgelodge.org.uk";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

interface BroadcastBody {
  subject: string;
  targetList: "members_pipeline" | "public_visitors";
  content: {
    wmDesk: string;
    meetingRecap: string;
    charitySpotlight: string;
    masonicHistory: string;
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.7;color:#1f2937">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function renderHtml(body: BroadcastBody, unsubscribeUrl: string): string {
  const { content, subject } = body;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f4f1ea;font-family:Georgia,'Times New Roman',serif">
<div style="max-width:640px;margin:0 auto;background:#ffffff">
  <div style="background:#1B2A4A;padding:32px 28px;text-align:center;border-bottom:4px solid #C9A432">
    <div style="font-family:'Playfair Display',Georgia,serif;color:#C9A432;font-size:28px;letter-spacing:0.5px">Weybridge Lodge No. 6787</div>
    <div style="color:rgba(246,241,226,0.85);font-size:13px;margin-top:6px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif">Monthly Chronicle &amp; Labours</div>
  </div>
  <div style="padding:32px 28px">
    <h2 style="font-family:'Playfair Display',Georgia,serif;color:#1B2A4A;font-size:22px;margin:0 0 10px;border-bottom:1px solid #e5dccd;padding-bottom:8px">From the WM's Desk</h2>
    ${paragraphs(content.wmDesk)}

    <h2 style="font-family:'Playfair Display',Georgia,serif;color:#1B2A4A;font-size:22px;margin:28px 0 10px;border-bottom:1px solid #e5dccd;padding-bottom:8px">Last Meeting Labours</h2>
    ${paragraphs(content.meetingRecap)}

    <h2 style="font-family:'Playfair Display',Georgia,serif;color:#1B2A4A;font-size:22px;margin:28px 0 10px;border-bottom:1px solid #e5dccd;padding-bottom:8px">Charity Spotlight</h2>
    ${paragraphs(content.charitySpotlight)}

    <h2 style="font-family:'Playfair Display',Georgia,serif;color:#1B2A4A;font-size:22px;margin:28px 0 10px;border-bottom:1px solid #e5dccd;padding-bottom:8px">Masonic History &amp; Education</h2>
    ${paragraphs(content.masonicHistory)}
  </div>
  <div style="background:#1B2A4A;color:rgba(246,241,226,0.85);font-family:Arial,sans-serif;font-size:12px;padding:20px 28px;text-align:center;line-height:1.6">
    &copy; ${new Date().getFullYear()} Weybridge Lodge No. 6787 &middot; Guildford Masonic Centre, GU2 4DR<br>
    You received this because you are an active member, candidate, or requested updates.<br>
    <a href="${unsubscribeUrl}" style="color:#C9A432;text-decoration:underline">Unsubscribe from this list</a>
  </div>
</div>
</body></html>`;
}

async function getRecipients(target: BroadcastBody["targetList"]): Promise<Array<{ email: string; token: string | null }>> {
  const map = new Map<string, string | null>();
  if (target === "members_pipeline") {
    const { data: profiles } = await admin
      .from("profiles")
      .select("email,status")
      .in("status", ["active", "pending"])
      .not("email", "is", null);
    for (const r of profiles ?? []) {
      const e = (r.email ?? "").trim().toLowerCase();
      if (e) map.set(e, null);
    }
    const { data: cands } = await admin
      .from("candidates")
      .select("email")
      .not("email", "is", null);
    for (const r of cands ?? []) {
      const e = (r.email ?? "").trim().toLowerCase();
      if (e) map.set(e, null);
    }
  }
  // Always include public newsletter subscribers — they explicitly opted in.
  const { data: subs } = await admin
    .from("newsletter_subscribers")
    .select("email,unsubscribe_token")
    .is("unsubscribed_at", null);
  for (const r of subs ?? []) {
    const e = (r.email ?? "").trim().toLowerCase();
    if (e) map.set(e, r.unsubscribe_token);
  }
  return Array.from(map.entries()).map(([email, token]) => ({ email, token }));
}

async function sendBatch(emails: Array<{ to: string; html: string; subject: string }>): Promise<{ ok: boolean; error?: string }> {
  // Resend batch endpoint: up to 100 per call.
  const payload = emails.map((e) => ({
    from: FROM_ADDRESS,
    to: [e.to],
    subject: e.subject,
    html: e.html,
    reply_to: REPLY_TO,
  }));
  const res = await fetch(`${GATEWAY_URL}/emails/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${text}` };
  }
  await res.text();
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Authn: derive user from JWT in Authorization header
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Sign-in required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userResult, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userResult?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userResult.user.id;

    // Authz
    const { data: canEdit, error: rpcErr } = await admin.rpc("can_edit_newsletter", { _user: userId });
    if (rpcErr || canEdit !== true) {
      return new Response(JSON.stringify({ error: "Not authorised to send the newsletter" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as BroadcastBody;
    if (
      !body?.subject?.trim() ||
      !["members_pipeline", "public_visitors"].includes(body.targetList) ||
      !body.content?.wmDesk?.trim() ||
      !body.content?.meetingRecap?.trim() ||
      !body.content?.charitySpotlight?.trim() ||
      !body.content?.masonicHistory?.trim()
    ) {
      return new Response(JSON.stringify({ error: "All fields are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = await getRecipients(body.targetList);
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No recipients found for the selected list." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: logRow } = await admin
      .from("newsletter_broadcasts")
      .insert({
        subject: body.subject.trim(),
        target_list: body.targetList,
        content: body.content,
        sent_by: userId,
        recipient_count: recipients.length,
        status: "sending",
      })
      .select("id")
      .single();

    // Build per-recipient emails with personalised unsubscribe URLs
    const fnBase = `${SUPABASE_URL}/functions/v1/newsletter-unsubscribe`;
    const generalUnsub = "https://weybridgelodge.org.uk/contact";

    const allEmails = recipients.map((r) => ({
      to: r.email,
      subject: body.subject.trim(),
      html: renderHtml(body, r.token ? `${fnBase}?token=${r.token}` : generalUnsub),
    }));

    let sentCount = 0;
    let firstError: string | undefined;
    for (let i = 0; i < allEmails.length; i += 100) {
      const chunk = allEmails.slice(i, i + 100);
      const result = await sendBatch(chunk);
      if (result.ok) {
        sentCount += chunk.length;
      } else if (!firstError) {
        firstError = result.error;
        break;
      }
    }

    await admin
      .from("newsletter_broadcasts")
      .update({
        status: firstError ? "failed" : "sent",
        error: firstError ?? null,
        recipient_count: sentCount,
      })
      .eq("id", logRow!.id);

    if (firstError) {
      return new Response(JSON.stringify({ error: firstError, sent: sentCount }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, recipientCount: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("broadcast-newsletter exception:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
