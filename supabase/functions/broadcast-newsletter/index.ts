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
const FROM_ADDRESS =
  Deno.env.get("NEWSLETTER_FROM_EMAIL") ??
  "Weybridge Lodge No. 6787 <onboarding@resend.dev>";
const REPLY_TO = "communications@weybridgelodge.org.uk";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

type Block =
  | { id?: string; type: "text"; text: string }
  | { id?: string; type: "image"; url: string; alt?: string; caption?: string };

interface Section {
  id?: string;
  heading: string;
  layout?: "single" | "masonry";
  blocks: Block[];
}

interface NewsletterContent {
  sections: Section[];
}

interface BroadcastBody {
  broadcastId: string;
  subject: string;
  targetList: "members_pipeline" | "public_visitors";
  content: NewsletterContent;
}

const LOGO_URL = "https://bright-lodge-spark.lovable.app/__l5e/assets-v1/c8d69345-d84c-4619-a96a-e59f04aa0481/weybridge-logo-white.png";

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
    .map((p) => `<p style="margin:0 0 12px;line-height:1.7;color:#1f2937;font-size:15px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function migrateContent(raw: any): NewsletterContent {
  if (raw && Array.isArray(raw.sections)) return raw as NewsletterContent;
  if (raw && (raw.wmDesk || raw.meetingRecap || raw.charitySpotlight || raw.masonicHistory)) {
    return {
      sections: [
        { heading: "From the WM's Desk",          layout: "single", blocks: [{ type: "text", text: raw.wmDesk || "" }] },
        { heading: "Last Meeting Labours",        layout: "single", blocks: [{ type: "text", text: raw.meetingRecap || "" }] },
        { heading: "Charity Spotlight",           layout: "single", blocks: [{ type: "text", text: raw.charitySpotlight || "" }] },
        { heading: "Masonic History & Education", layout: "single", blocks: [{ type: "text", text: raw.masonicHistory || "" }] },
      ],
    };
  }
  return { sections: [] };
}

function renderBlock(b: Block): string {
  if (b.type === "image") {
    if (!b.url) return "";
    const cap = b.caption ? `<div style="font-size:12px;color:#6b7280;margin-top:4px">${escapeHtml(b.caption)}</div>` : "";
    return `<img src="${escapeHtml(b.url)}" alt="${escapeHtml(b.alt || "")}" style="display:block;width:100%;max-width:100%;border:0;border-radius:4px">${cap}`;
  }
  return paragraphs(b.text || "");
}

function renderSection(s: Section): string {
  const heading = `<h2 style="font-family:'Playfair Display',Georgia,serif;color:#1B2A4A;font-size:22px;margin:28px 0 12px;border-bottom:1px solid #e5dccd;padding-bottom:8px">${escapeHtml(s.heading || "")}</h2>`;
  const blocks = s.blocks || [];
  if (s.layout === "masonry" && blocks.length > 1) {
    // 2-column table (email-safe approximation of masonry)
    const cells = blocks
      .map((b) => `<td valign="top" width="50%" style="padding:6px;vertical-align:top">${renderBlock(b)}</td>`)
      .join("");
    // Wrap pairs into rows
    const rows: string[] = [];
    const cellArr = blocks.map((b) => `<td valign="top" width="50%" style="padding:6px;vertical-align:top">${renderBlock(b)}</td>`);
    for (let i = 0; i < cellArr.length; i += 2) {
      const pair = cellArr.slice(i, i + 2);
      if (pair.length === 1) pair.push('<td width="50%"></td>');
      rows.push(`<tr>${pair.join("")}</tr>`);
    }
    return `${heading}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tbody>${rows.join("")}</tbody></table>`;
  }
  return `${heading}<div>${blocks.map(renderBlock).join("")}</div>`;
}

function renderHtml(body: Omit<BroadcastBody, "broadcastId">, unsubscribeUrl: string): string {
  const { content, subject } = body;
  const sectionsHtml = (content.sections || []).map(renderSection).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f4f1ea;font-family:Georgia,'Times New Roman',serif">
<div style="max-width:640px;margin:0 auto;background:#ffffff">
  <div style="background:#1B2A4A;padding:20px 24px;border-bottom:4px solid #C9A432">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
      <td width="72" valign="middle" style="padding-right:14px">
        <img src="${LOGO_URL}" alt="Weybridge Lodge crest" width="64" height="64" style="display:block;width:64px;height:64px;border:0">
      </td>
      <td valign="middle" align="left">
        <div style="font-family:'Playfair Display',Georgia,serif;color:#C9A432;font-size:24px;letter-spacing:0.5px;line-height:1.1">Weybridge Lodge No. 6787</div>
        <div style="color:rgba(246,241,226,0.85);font-size:12px;margin-top:4px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif">Monthly Chronicle &amp; Labours</div>
      </td>
    </tr></table>
  </div>
  <div style="padding:24px 28px">${sectionsHtml}</div>
  <div style="background:#1B2A4A;padding:18px 28px 8px;text-align:center">
    <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 10px"><tr>
      <td style="padding:0 6px"><a href="https://instagram.com/weybridgelodge/" style="display:inline-block;background:#C9A432;color:#1B2A4A;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;text-decoration:none;width:28px;height:28px;line-height:28px;border-radius:14px;text-align:center">IG</a></td>
      <td style="padding:0 6px"><a href="https://facebook.com/people/Weybridge-Lodge-No-6787/61551808420513/" style="display:inline-block;background:#C9A432;color:#1B2A4A;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;text-decoration:none;width:28px;height:28px;line-height:28px;border-radius:14px;text-align:center">f</a></td>
      <td style="padding:0 6px"><a href="https://twitter.com/weybridgelodge" style="display:inline-block;background:#C9A432;color:#1B2A4A;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;text-decoration:none;width:28px;height:28px;line-height:28px;border-radius:14px;text-align:center">X</a></td>
      <td style="padding:0 6px"><a href="https://weybridgelodge.org.uk" style="display:inline-block;background:#C9A432;color:#1B2A4A;font-family:Arial,sans-serif;font-size:10px;font-weight:bold;text-decoration:none;width:28px;height:28px;line-height:28px;border-radius:14px;text-align:center">Web</a></td>
    </tr></table>
    <div style="color:rgba(246,241,226,0.85);font-family:Arial,sans-serif;font-size:12px;padding:6px 0 14px;line-height:1.6">
      &copy; ${new Date().getFullYear()} Weybridge Lodge No. 6787 &middot; Guildford Masonic Centre, GU2 4DR<br>
      You received this because you are an active member, candidate, or requested updates.<br>
      <a href="${unsubscribeUrl}" style="color:#C9A432;text-decoration:underline">Unsubscribe from this list</a>
    </div>
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

async function archiveToDocuments(opts: {
  broadcastId: string;
  subject: string;
  targetList: string;
  html: string;
  userId: string;
  recipientCount: number;
}) {
  const safeSubject = opts.subject.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const path = `newsletter/${Date.now()}-${opts.broadcastId}-${safeSubject}.html`;
  const blob = new Blob([opts.html], { type: "text/html; charset=utf-8" });
  const { error: upErr } = await admin.storage.from("lodge-docs").upload(path, blob, {
    contentType: "text/html; charset=utf-8",
    upsert: false,
  });
  if (upErr) {
    console.error("archiveToDocuments upload error:", upErr);
    return;
  }
  await admin.from("lodge_documents").insert({
    title: opts.subject,
    description: `Sent to ${opts.recipientCount} recipient${opts.recipientCount === 1 ? "" : "s"} (${opts.targetList === "members_pipeline" ? "Members & Candidates" : "Public Subscribers"})`,
    category: "newsletter",
    file_path: path,
    file_size_bytes: opts.html.length,
    uploaded_by: opts.userId,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
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

    const { data: canEdit, error: rpcErr } = await admin.rpc("can_edit_newsletter", { _user: userId });
    if (rpcErr || canEdit !== true) {
      return new Response(JSON.stringify({ error: "Not authorised to send the newsletter" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as BroadcastBody;
    if (!body?.broadcastId) {
      return new Response(JSON.stringify({ error: "Save the newsletter first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load row from DB — DB is the source of truth, must be 'ready_to_send'
    const { data: row, error: rowErr } = await admin
      .from("newsletter_broadcasts")
      .select("id,status,subject,target_list,content")
      .eq("id", body.broadcastId)
      .single();
    if (rowErr || !row) {
      return new Response(JSON.stringify({ error: "Newsletter not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (row.status !== "ready_to_send") {
      return new Response(
        JSON.stringify({ error: `Status must be "Ready to send" before broadcasting (current: ${row.status}).` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const content = row.content as BroadcastBody["content"];
    const subject = (row.subject ?? "").trim();
    const targetList = row.target_list as BroadcastBody["targetList"];
    if (
      !subject ||
      !["members_pipeline", "public_visitors"].includes(targetList) ||
      !content?.wmDesk?.trim() ||
      !content?.meetingRecap?.trim() ||
      !content?.charitySpotlight?.trim() ||
      !content?.masonicHistory?.trim()
    ) {
      return new Response(JSON.stringify({ error: "All fields are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = await getRecipients(targetList);
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No recipients found for the selected list." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("newsletter_broadcasts")
      .update({ status: "sending", sent_by: userId, recipient_count: recipients.length })
      .eq("id", body.broadcastId);

    const fnBase = `${SUPABASE_URL}/functions/v1/newsletter-unsubscribe`;
    const generalUnsub = "https://weybridgelodge.org.uk/contact";

    const allEmails = recipients.map((r) => ({
      to: r.email,
      subject,
      html: renderHtml({ subject, targetList, content }, r.token ? `${fnBase}?token=${r.token}` : generalUnsub),
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
      .eq("id", body.broadcastId);

    if (!firstError) {
      // Archive a copy into the Documents library under "Newsletters".
      const archiveHtml = renderHtml({ subject, targetList, content }, "https://weybridgelodge.org.uk/contact");
      await archiveToDocuments({
        broadcastId: body.broadcastId,
        subject,
        targetList,
        html: archiveHtml,
        userId,
        recipientCount: sentCount,
      });
    }

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
