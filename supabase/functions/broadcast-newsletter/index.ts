import { createClient } from "npm:@supabase/supabase-js@2";
import { sendLovableEmail } from "npm:@lovable.dev/email-js";
import { loadLodgeSettings, resolveLodgeSettings } from "../_shared/lodgeSettings.ts";
import { buildNewsletterArchivePdf } from "../_shared/newsletterArchivePdf.ts";
import { loadCrest, type ProcessedCrest } from "../_shared/pdfLibBrand.ts";
import { once, runSendsThenArchives } from "../_shared/newsletterDispatch.ts";
import { newsletterBrandFrom, newsletterFooterHtml, newsletterHeaderHtml } from "../_shared/newsletterBrand.ts";
import { EMAIL_DOMAINS } from "../_shared/emailDomains.ts";
let LODGE = resolveLodgeSettings(null);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-debug-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// Sending domains are deployment-level (verified email DNS); single source: _shared/emailDomains.ts.
const SENDER_DOMAIN = EMAIL_DOMAINS.senderDomain;
const FROM_DOMAIN = EMAIL_DOMAINS.fromDomain;
const FROM_ADDRESS =
  Deno.env.get("NEWSLETTER_FROM_EMAIL") ??
  null;
const fromAddress = (l: { formalSenderName: string }) => FROM_ADDRESS ?? `${l.formalSenderName} <noreply@${FROM_DOMAIN}>`;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);


type Block =
  | { id?: string; type: "text"; text: string }
  | { id?: string; type: "image"; url: string; alt?: string; caption?: string };
interface Section { id?: string; heading: string; layout?: "single" | "masonry"; blocks: Block[] }
interface NewsletterContent { sections: Section[] }

// Audience the user requests. "all" is only valid with unified_content = true,
// and triggers a single merged send to the deduplicated combined list.
type Audience = "members" | "members_only" | "visitors" | "all";

interface BroadcastBody {
  broadcastId: string;
  audiences?: Audience[];
  /** When set, nothing is broadcast: one test copy goes to this address only. */
  testEmail?: string;
  /** Which content variant the test copy should render. Defaults to "members". */
  testAudience?: Audience;
}

const AUDIENCE_LABEL: Record<Audience, string> = {
  members: "Members & Visitors",
  members_only: "Members Only",
  visitors: "Public",
  all: "Members & Visitors and Public",
};
const AUDIENCE_FILENAME: Record<Audience, string> = {
  members: "MembersVisitors",
  members_only: "MembersOnly",
  visitors: "Public",
  all: "All",
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const LINK_STYLE = "color:#1B2A4A;text-decoration:underline;font-weight:bold";
const BUTTON_STYLE =
  "display:inline-block;background:#C9A432;color:#1B2A4A;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;padding:10px 18px;border-radius:4px;margin:4px 0";

function safeUrl(raw: string): string | null {
  const u = raw.trim().replace(/&amp;/g, "&");
  if (/^https?:\/\//i.test(u) || /^mailto:/i.test(u)) return escapeHtml(u);
  if (/^www\./i.test(u)) return escapeHtml("https://" + u);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u)) return escapeHtml("mailto:" + u);
  return null;
}

/**
 * Inline formatting for newsletter body text.
 * Supported (authored by the editor's "Insert link" / "Insert button" tools):
 *   [label](https://url)   -> inline anchor
 *   [[label]](https://url) -> gold button anchor
 *   bare https://… , www.… and email addresses -> auto-linked
 * Input is escaped first; only our own generated markup is raw HTML.
 */
function inlineFormat(text: string): string {
  const slots: string[] = [];
  const stash = (html: string) => {
    slots.push(html);
    return `\u0000${slots.length - 1}\u0000`;
  };

  let s = escapeHtml(text);

  // Button syntax first ([[label]](url)), then plain links.
  s = s.replace(/\[\[([^\]]+)\]\]\(([^)\s]+)\)/g, (m, label, url) => {
    const href = safeUrl(url);
    return href ? stash(`<a href="${href}" style="${BUTTON_STYLE}">${label}</a>`) : m;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
    const href = safeUrl(url);
    return href ? stash(`<a href="${href}" style="${LINK_STYLE}">${label}</a>`) : m;
  });

  // Bare URLs / emails that weren't already wrapped above.
  s = s.replace(/(^|[\s(])((?:https?:\/\/|www\.)[^\s<)]+[^\s<).,;:!?])/gi, (_m, pre, url) => {
    const href = safeUrl(url);
    return href ? pre + stash(`<a href="${href}" style="${LINK_STYLE}">${url}</a>`) : pre + url;
  });
  s = s.replace(/(^|[\s(])([^\s<>()@]+@[^\s<>()@]+\.[a-z]{2,})/gi, (_m, pre, addr) => {
    const href = safeUrl(addr);
    return href ? pre + stash(`<a href="${href}" style="${LINK_STYLE}">${addr}</a>`) : pre + addr;
  });
  // Bare domains without a scheme, e.g. "example.org/bookings".
  s = s.replace(
    /(^|[\s(])((?:[a-z0-9-]+\.)+(?:co\.uk|org\.uk|ac\.uk|com|org|net|uk|io|dev)(?:\/[^\s<)]*)?)/gi,
    (_m, pre, url) => {
      const clean = String(url).replace(/[.,;:!?]+$/, "");
      const trail = String(url).slice(clean.length);
      return pre + stash(`<a href="${escapeHtml("https://" + clean)}" style="${LINK_STYLE}">${clean}</a>`) + trail;
    },
  );



  return s.replace(/\u0000(\d+)\u0000/g, (_m, i) => slots[Number(i)]);
}

function paragraphs(text: string): string {
  return text.split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px;line-height:1.7;color:#1f2937;font-size:15px">${inlineFormat(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function migrateContent(raw: any): NewsletterContent {
  if (raw && Array.isArray(raw.sections)) return raw as NewsletterContent;
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
    const cellArr = blocks.map((b) => `<td class="nl-col" valign="top" width="48%" style="width:48%;padding:6px;vertical-align:top">${renderBlock(b)}</td>`);
    const rows: string[] = [];
    for (let i = 0; i < cellArr.length; i += 2) {
      const pair = cellArr.slice(i, i + 2);
      if (pair.length === 1) pair.push('<td class="nl-col" width="48%" style="width:48%"></td>');
      rows.push(`<tr>${pair.join("")}</tr>`);
    }
    return `${heading}<table class="nl-masonry" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%"><tbody>${rows.join("")}</tbody></table>`;
  }
  return `${heading}<div>${blocks.map(renderBlock).join("")}</div>`;
}

function renderHtml(opts: { subject: string; content: NewsletterContent; unsubscribeUrl: string }): string {
  const { subject, content, unsubscribeUrl } = opts;
  const sectionsHtml = (content.sections || []).map(renderSection).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title>
<style>
  @media only screen and (max-width: 480px) {
    table.nl-masonry, table.nl-masonry tbody, table.nl-masonry tr { display:block !important; width:100% !important; }
    td.nl-col { display:block !important; width:100% !important; max-width:100% !important; padding:6px 0 !important; box-sizing:border-box !important; }
    td.nl-col img { width:100% !important; height:auto !important; }
  }
</style>
</head>
<body style="margin:0;background:#f4f1ea;font-family:Georgia,'Times New Roman',serif">
<div style="max-width:640px;margin:0 auto;background:#ffffff">
  ${newsletterHeaderHtml(newsletterBrandFrom(LODGE))}
  <div style="padding:24px 28px">${sectionsHtml}</div>
  ${newsletterFooterHtml(newsletterBrandFrom(LODGE), unsubscribeUrl)}
</div>
</body></html>`;
}

type Recipient = { email: string; token: string; kind: "member" | "visitor" | "public" };

/**
 * Build the deduplicated recipient list for a requested audience.
 * - "members"  = active/pending members  +  visitor_contacts (visiting Freemasons)
 * - "visitors" = public newsletter_subscribers
 * - "all"      = union of both, deduped on lowercased email.
 *                Precedence: member > visitor > public.
 *
 * Members are excluded if they have an active member_newsletter_opt_outs row.
 * Visitor contacts are excluded if opted_out_at is set.
 * Each member is ensured to have a stable per-recipient token in that table.
 */
async function getRecipients(audience: Audience): Promise<Recipient[]> {
  const map = new Map<string, Recipient>();

  if (audience === "members" || audience === "members_only" || audience === "all") {
    // 1a. Active/pending members with an email.
    const { data: profiles } = await admin
      .from("profiles")
      .select("id,email,status")
      .in("status", ["active", "pending"])
      .not("email", "is", null);
    const rows = (profiles ?? []).filter((p) => (p.email ?? "").trim());
    const userIds = rows.map((p) => p.id as string);

    const { data: existing } = userIds.length
      ? await admin
          .from("member_newsletter_opt_outs")
          .select("user_id,token,opted_out_at")
          .in("user_id", userIds)
      : { data: [] as any[] };
    const tokenByUser = new Map<string, { token: string; opted: boolean }>();
    for (const r of existing ?? []) {
      tokenByUser.set(r.user_id as string, { token: r.token as string, opted: !!r.opted_out_at });
    }

    const missing = userIds.filter((id) => !tokenByUser.has(id));
    if (missing.length) {
      const { data: inserted } = await admin
        .from("member_newsletter_opt_outs")
        .insert(missing.map((user_id) => ({ user_id })))
        .select("user_id,token");
      for (const r of inserted ?? []) {
        tokenByUser.set(r.user_id as string, { token: r.token as string, opted: false });
      }
    }

    for (const p of rows) {
      const entry = tokenByUser.get(p.id as string);
      if (!entry || entry.opted) continue;
      const email = (p.email as string).trim().toLowerCase();
      if (!email) continue;
      map.set(email, { email, token: entry.token, kind: "member" });
    }

    // 1b. Visiting Freemasons captured via Festive Board.
    //     Skipped entirely for "members_only" (internal circulation).
    const { data: visitors } = audience === "members_only"
      ? { data: [] as any[] }
      : await admin
      .from("visitor_contacts")
      .select("email,unsubscribe_token")
      .is("opted_out_at", null);
    for (const v of visitors ?? []) {
      const email = (v.email ?? "").trim().toLowerCase();
      if (!email) continue;
      if (!map.has(email)) {
        map.set(email, { email, token: v.unsubscribe_token as string, kind: "visitor" });
      }
    }
  }

  if (audience === "visitors" || audience === "all") {
    const { data: subs } = await admin
      .from("newsletter_subscribers")
      .select("email,unsubscribe_token")
      .eq("confirmed", true) // double opt-in: never send to unconfirmed addresses
      .is("unsubscribed_at", null);
    for (const r of subs ?? []) {
      const email = (r.email ?? "").trim().toLowerCase();
      if (!email) continue;
      if (!map.has(email)) {
        map.set(email, { email, token: r.unsubscribe_token as string, kind: "public" });
      }
    }
  }

  return Array.from(map.values());
}

// Every transactional/marketing send through the Lovable email API requires an
// unsubscribe token. One token per email address, reused across sends.
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getUnsubscribeToken(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const { data: existing } = await admin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .maybeSingle();
  if (existing?.token) return existing.token as string;

  const token = generateToken();
  await admin
    .from("email_unsubscribe_tokens")
    .upsert({ token, email: normalized }, { onConflict: "email", ignoreDuplicates: true });
  const { data: stored } = await admin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .maybeSingle();
  return (stored?.token as string) ?? token;
}

// Sends through the Lovable email API on the lodge's verified sender domain —
// the same pipeline every other email in the portal uses. The previous Resend
// connector route sent from the unverified `onboarding@resend.dev` sandbox
// address, which Resend rejects with a 422 for any real recipient.
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h1|h2|h3|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sendBatch(emails: Array<{ to: string; html: string; subject: string }>): Promise<{ ok: boolean; error?: string }> {
  for (const e of emails) {
    try {
      const unsubscribeToken = await getUnsubscribeToken(e.to);
      await sendLovableEmail(
        {
          to: e.to,
          from: fromAddress(LODGE),
          reply_to: LODGE.communicationsEmail,
          sender_domain: SENDER_DOMAIN,
          subject: e.subject,
          html: e.html,
          text: htmlToText(e.html),

          purpose: "transactional",
          label: "newsletter",
          idempotency_key: crypto.randomUUID(),
          unsubscribe_token: unsubscribeToken,
        },
        { apiKey: LOVABLE_API_KEY, sendUrl: Deno.env.get("LOVABLE_SEND_URL") },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Newsletter send failed", { to: e.to, error: msg });
      return { ok: false, error: `Email API: ${msg}` };
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return { ok: true };
}


async function renderNewsletterPdf(opts: {
  subject: string;
  audienceLabel: string;
  recipientCount: number;
  content: NewsletterContent;
  crest?: () => Promise<ProcessedCrest | null>;
}): Promise<Uint8Array> {
  const { crest, ...rest } = opts;
  return await buildNewsletterArchivePdf({ ...rest, brand: newsletterBrandFrom(LODGE), ...(crest ? { loadCrestImpl: () => crest() } : {}) });
}

function issuePrefix(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function archiveToDocuments(opts: {
  broadcastId: string;
  subject: string;
  audience: Audience;
  content: NewsletterContent;
  userId: string;
  recipientCount: number;
  crest?: () => Promise<ProcessedCrest | null>;
}) {
  const tag = AUDIENCE_FILENAME[opts.audience];
  const safeSubject = opts.subject.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  const fileName = `${issuePrefix()}_${LODGE.senderName.split(/\s+/)[0].replace(/[^A-Za-z0-9]/g, "")}Chronicle_${tag}_${safeSubject || "Issue"}.pdf`;
  const path = `newsletter/${Date.now()}-${opts.broadcastId}-${tag}-${safeSubject}.pdf`;
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await renderNewsletterPdf({
      subject: opts.subject,
      audienceLabel: AUDIENCE_LABEL[opts.audience],
      recipientCount: opts.recipientCount,
      content: opts.content,
      crest: opts.crest,
    });
  } catch (e) {
    console.error("archiveToDocuments PDF render error:", e);
    return;
  }
  const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
  const { error: upErr } = await admin.storage.from("lodge-docs").upload(path, blob, {
    contentType: "application/pdf", upsert: false,
  });
  if (upErr) { console.error("archiveToDocuments upload error:", upErr); return; }
  await admin.from("lodge_documents").insert({
    title: fileName.replace(/\.pdf$/, ""),
    description: `${AUDIENCE_LABEL[opts.audience]} edition — sent to ${opts.recipientCount} recipient${opts.recipientCount === 1 ? "" : "s"} on ${new Date().toLocaleDateString("en-GB")}. Subject: "${opts.subject}".`,
    category: "newsletter",
    file_path: path,
    file_size_bytes: pdfBytes.byteLength,
    uploaded_by: opts.userId,
  });
}

function sectionsHaveContent(content: NewsletterContent | null | undefined): boolean {
  if (!content || !Array.isArray(content.sections) || content.sections.length === 0) return false;
  return content.sections.every((s) =>
    (s.blocks || []).some((b) => (b.type === "text" && b.text?.trim()) || (b.type === "image" && b.url?.trim())),
  );
}

type DispatchResult = { audience: Audience; sent: number; error?: string; archivedId?: string; archive?: () => Promise<void> };

async function dispatchOneAudience(opts: {
  broadcastId: string;
  audience: Audience;
  subject: string;
  content: NewsletterContent;
  userId: string;
  unifiedContent: boolean;
  crest?: () => Promise<ProcessedCrest | null>;
}): Promise<DispatchResult> {
  const { audience, subject, content, userId, broadcastId, unifiedContent } = opts;

  const recipients = await getRecipients(audience);
  if (recipients.length === 0) {
    return { audience, sent: 0, error: `No recipients found for ${AUDIENCE_LABEL[audience]}.` };
  }

  const { data: archived, error: insErr } = await admin
    .from("newsletter_broadcasts")
    .insert({
      subject,
      target_list: audience,
      content,
      content_visitors: {},
      status: "sending",
      sent_by: userId,
      recipient_count: recipients.length,
      audience,
      unified_content: unifiedContent,
    })
    .select("id")
    .single();
  if (insErr || !archived) {
    return { audience, sent: 0, error: `Failed to log send: ${insErr?.message || "unknown"}` };
  }

  const fnBase = `${SUPABASE_URL}/functions/v1/newsletter-unsubscribe`;
  const allEmails = recipients.map((r) => ({
    to: r.email,
    subject,
    html: renderHtml({ subject, content, unsubscribeUrl: `${fnBase}?token=${r.token}` }),
  }));

  let sentCount = 0;
  let firstError: string | undefined;
  for (let i = 0; i < allEmails.length; i += 100) {
    const chunk = allEmails.slice(i, i + 100);
    const result = await sendBatch(chunk);
    if (result.ok) sentCount += chunk.length;
    else { firstError = result.error; break; }
  }

  await admin.from("newsletter_broadcasts").update({
    status: firstError ? "failed" : "sent",
    error: firstError ?? null,
    recipient_count: sentCount,
  }).eq("id", archived.id);

  // Archive PDF is built later, after every audience's emails have gone out (Job AS-2).
  const archive = firstError ? undefined : () => archiveToDocuments({
    broadcastId: archived.id, subject, audience, content, userId, recipientCount: sentCount, crest: opts.crest,
  });

  return { audience, sent: sentCount, error: firstError, archivedId: archived.id, archive };
}

Deno.serve(async (req) => {
  LODGE = await loadLodgeSettings();
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Sign-in required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userResult, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userResult?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userResult.user.id;

    const { data: canEdit, error: rpcErr } = await admin.rpc("can_edit_newsletter", { _user: userId });
    if (rpcErr || canEdit !== true) {
      console.error("can_edit_newsletter denied", { userId, rpcErr });
      return new Response(JSON.stringify({ error: "Not authorised to send the newsletter" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }



    const body = (await req.json()) as BroadcastBody;
    if (!body?.broadcastId) {
      return new Response(JSON.stringify({ error: "Save the newsletter first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: row, error: rowErr } = await admin
      .from("newsletter_broadcasts")
      .select("id,status,subject,content,content_visitors,audience,unified_content")
      .eq("id", body.broadcastId)
      .single();
    if (rowErr || !row) {
      return new Response(JSON.stringify({ error: "Newsletter not found." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const isTestSend = typeof body.testEmail === "string" && !!body.testEmail.trim();
    if (!isTestSend && row.status !== "ready_to_send") {
      return new Response(JSON.stringify({ error: `Status must be "Ready to send" before broadcasting (current: ${row.status}).` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const subject = (row.subject ?? "").trim();
    if (!subject) {
      return new Response(JSON.stringify({ error: "Add a subject line before broadcasting." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unified = !!row.unified_content;
    const requested: Audience[] = Array.isArray(body.audiences) && body.audiences.length > 0
      ? Array.from(new Set(body.audiences.filter((a): a is Audience => a === "members" || a === "members_only" || a === "visitors" || a === "all")))
      : ["members"];

    // Resolve content variants. In unified mode the canonical content is the
    // "members" variant — used for every audience including "all".
    const membersContent = migrateContent(row.content);
    const visitorsContent = unified ? membersContent : migrateContent(row.content_visitors);

    const variantFor = (a: Audience): NewsletterContent =>
      a === "visitors" ? visitorsContent : membersContent;

    // ---- TEST SEND -------------------------------------------------------
    // Renders through the exact same pipeline as a real broadcast and mails a
    // single copy. Nothing is logged as a broadcast and nothing is archived.
    if (typeof body.testEmail === "string" && body.testEmail.trim()) {
      const testEmail = body.testEmail.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testEmail)) {
        return new Response(JSON.stringify({ error: "Enter a valid test email address." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const testAudience: Audience =
        body.testAudience === "visitors" || body.testAudience === "members_only" || body.testAudience === "all"
          ? body.testAudience
          : "members";
      const testContent = variantFor(testAudience);
      const html = renderHtml({
        subject,
        content: testContent,
        unsubscribeUrl: `${SUPABASE_URL}/functions/v1/newsletter-unsubscribe?token=test-preview`,
      });
      const result = await sendBatch([
        { to: testEmail, subject: `[TEST] ${subject}`, html },
      ]);
      if (!result.ok) {
        console.error("Test send failed", { testEmail, from: fromAddress(LODGE), error: result.error });
        return new Response(JSON.stringify({ error: result.error || "Test send failed" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("Test send OK", { testEmail, audience: testAudience });

      return new Response(JSON.stringify({ ok: true, test: true, sentTo: testEmail, audience: testAudience }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate every requested audience has content.
    for (const aud of requested) {
      if (aud === "all" && !unified) {
        return new Response(JSON.stringify({ error: '"Send to all" requires Unified content mode.' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!sectionsHaveContent(variantFor(aud))) {
        return new Response(JSON.stringify({
          error: `The ${AUDIENCE_LABEL[aud]} edition has one or more empty sections. Fill every section or remove it before sending.`,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    await admin.from("newsletter_broadcasts")
      .update({ status: "sending", sent_by: userId })
      .eq("id", body.broadcastId);

    // One crest load per send, shared by every audience's archive PDF.
    const crestOnce = once(() => loadCrest(newsletterBrandFrom(LODGE).crestUrl));
    let errors: DispatchResult[] = [];
    const results = await runSendsThenArchives<Audience, DispatchResult>({
      audiences: requested,
      send: (aud) => dispatchOneAudience({
        broadcastId: body.broadcastId,
        audience: aud,
        subject,
        content: variantFor(aud),
        userId,
        unifiedContent: unified,
        crest: crestOnce,
      }),
      afterSends: async (rs) => {
        const totalSent = rs.reduce((s, r) => s + r.sent, 0);
        errors = rs.filter((r) => r.error);
        await admin.from("newsletter_broadcasts").update({
          status: errors.length === rs.length ? "failed" : "sent",
          error: errors.length ? errors.map((e) => `${e.audience}: ${e.error}`).join("; ") : null,
          recipient_count: totalSent,
        }).eq("id", body.broadcastId);
      },
    });
    const totalSent = results.reduce((s, r) => s + r.sent, 0);

    if (errors.length === results.length) {
      return new Response(JSON.stringify({ error: errors[0].error, results }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      recipientCount: totalSent,
      results: results.map((r) => ({ audience: r.audience, sent: r.sent, error: r.error ?? null })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("broadcast-newsletter exception:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
