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

type Audience = "members" | "visitors";

interface BroadcastBody {
  broadcastId: string;
  audiences?: Audience[]; // which variants to actually dispatch
  // Legacy clients may still send these; ignored — DB is source of truth.
  subject?: string;
  targetList?: "members_pipeline" | "public_visitors";
  content?: NewsletterContent;
}

const AUDIENCE_LABEL: Record<Audience, string> = {
  members: "Members & Candidates",
  visitors: "Public Subscribers",
};
const AUDIENCE_TARGET_LIST: Record<Audience, "members_pipeline" | "public_visitors"> = {
  members: "members_pipeline",
  visitors: "public_visitors",
};

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
    // Email-safe two-column grid: table cells render in Outlook,
    // and the `.nl-col` class collapses to 100% width on phones via
    // the @media rule injected into the document <head>.
    const cellArr = blocks.map(
      (b) =>
        `<td class="nl-col" valign="top" width="48%" style="width:48%;padding:6px;vertical-align:top">${renderBlock(b)}</td>`,
    );
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

function renderHtml(body: Omit<BroadcastBody, "broadcastId">, unsubscribeUrl: string): string {
  const { content, subject } = body;
  const sectionsHtml = (content.sections || []).map(renderSection).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title>
<style>
  /* Mobile: collapse the masonry table to a single stacked column. */
  @media only screen and (max-width: 480px) {
    table.nl-masonry, table.nl-masonry tbody, table.nl-masonry tr { display:block !important; width:100% !important; }
    td.nl-col { display:block !important; width:100% !important; max-width:100% !important; padding:6px 0 !important; box-sizing:border-box !important; }
    td.nl-col img { width:100% !important; height:auto !important; }
  }
</style>
</head>
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

async function renderNewsletterPdf(opts: {
  subject: string;
  targetList: string;
  recipientCount: number;
  content: NewsletterContent;
}): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("npm:pdf-lib@1.17.1");
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const helvOblique = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const A4 = { w: 595.28, h: 841.89 };
  const navy = rgb(0x1B / 255, 0x2A / 255, 0x4A / 255);
  const gold = rgb(0xC9 / 255, 0xA4 / 255, 0x32 / 255);
  const ink = rgb(0.12, 0.13, 0.16);
  const muted = rgb(0.45, 0.47, 0.5);

  const marginX = 50;
  const contentWidth = A4.w - marginX * 2;
  let page = pdf.addPage([A4.w, A4.h]);
  let y = A4.h;

  const drawHeader = () => {
    page.drawRectangle({ x: 0, y: A4.h - 96, width: A4.w, height: 96, color: navy });
    page.drawRectangle({ x: 0, y: A4.h - 100, width: A4.w, height: 4, color: gold });
    page.drawText("Weybridge Lodge No. 6787", {
      x: marginX, y: A4.h - 50, size: 20, font: helvBold, color: gold,
    });
    page.drawText("MONTHLY CHRONICLE & LABOURS", {
      x: marginX, y: A4.h - 72, size: 9, font: helv, color: rgb(1, 1, 1),
    });
    y = A4.h - 120;
  };
  drawHeader();

  const newPageIfNeeded = (need: number) => {
    if (y - need < 60) {
      page = pdf.addPage([A4.w, A4.h]);
      drawHeader();
    }
  };

  const wrapText = (text: string, font: any, size: number, maxWidth: number): string[] => {
    const lines: string[] = [];
    for (const rawPara of text.split(/\n/)) {
      const words = rawPara.split(/\s+/).filter(Boolean);
      if (words.length === 0) { lines.push(""); continue; }
      let line = "";
      for (const w of words) {
        const candidate = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
          if (line) lines.push(line);
          line = w;
        } else {
          line = candidate;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  };

  const drawWrapped = (text: string, opts: { font: any; size: number; color: any; lineHeight?: number }) => {
    const lh = opts.lineHeight ?? opts.size * 1.45;
    const lines = wrapText(text, opts.font, opts.size, contentWidth);
    for (const line of lines) {
      newPageIfNeeded(lh);
      // Sanitise to WinAnsi-friendly characters (replace smart quotes / em dash)
      const safe = line
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2014/g, "—")
        .replace(/[^\x00-\xFF]/g, "?");
      page.drawText(safe, { x: marginX, y: y - opts.size, size: opts.size, font: opts.font, color: opts.color });
      y -= lh;
    }
  };

  // Title (subject)
  drawWrapped(opts.subject, { font: helvBold, size: 16, color: navy, lineHeight: 20 });
  y -= 6;
  drawWrapped(
    `Issued ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} · ${opts.targetList === "members_pipeline" ? "Members & Candidates" : "Public Subscribers"} · ${opts.recipientCount} recipient${opts.recipientCount === 1 ? "" : "s"}`,
    { font: helvOblique, size: 9, color: muted, lineHeight: 12 },
  );
  y -= 10;

  for (const section of opts.content.sections) {
    newPageIfNeeded(40);
    // Heading
    drawWrapped(section.heading || "Untitled section", { font: helvBold, size: 13, color: navy, lineHeight: 18 });
    // Underline rule
    newPageIfNeeded(8);
    page.drawLine({
      start: { x: marginX, y: y - 2 },
      end: { x: marginX + contentWidth, y: y - 2 },
      thickness: 0.5, color: gold,
    });
    y -= 10;

    for (const block of section.blocks || []) {
      if (block.type === "text") {
        const txt = (block.text || "").trim();
        if (!txt) continue;
        for (const para of txt.split(/\n{2,}/)) {
          drawWrapped(para, { font: helv, size: 10.5, color: ink, lineHeight: 14 });
          y -= 6;
        }
      } else if (block.type === "image" && block.url) {
        try {
          const res = await fetch(block.url);
          if (!res.ok) throw new Error(`fetch ${res.status}`);
          const ct = (res.headers.get("content-type") || "").toLowerCase();
          const bytes = new Uint8Array(await res.arrayBuffer());
          const img = ct.includes("png")
            ? await pdf.embedPng(bytes)
            : await pdf.embedJpg(bytes);
          const maxW = contentWidth;
          const maxH = 260;
          const scale = Math.min(maxW / img.width, maxH / img.height, 1);
          const w = img.width * scale;
          const h = img.height * scale;
          newPageIfNeeded(h + (block.caption ? 18 : 6));
          page.drawImage(img, { x: marginX, y: y - h, width: w, height: h });
          y -= h + 4;
          if (block.caption) {
            drawWrapped(block.caption, { font: helvOblique, size: 9, color: muted, lineHeight: 12 });
          }
          y -= 6;
        } catch (e) {
          console.warn("PDF image embed failed:", block.url, e);
          drawWrapped(`[Image unavailable: ${block.url}]`, { font: helvOblique, size: 9, color: muted, lineHeight: 12 });
        }
      }
    }
    y -= 10;
  }

  // Footer line on last page
  newPageIfNeeded(30);
  y = Math.max(y, 50);
  page.drawLine({
    start: { x: marginX, y: 50 }, end: { x: A4.w - marginX, y: 50 },
    thickness: 0.5, color: rgb(0.85, 0.83, 0.8),
  });
  page.drawText(
    `© ${new Date().getFullYear()} Weybridge Lodge No. 6787 · Guildford Masonic Centre, GU2 4DR`,
    { x: marginX, y: 36, size: 8, font: helv, color: muted },
  );

  return await pdf.save();
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
}) {
  const audienceLabel = opts.audience === "members" ? "Members" : "Visitors";
  const safeSubject = opts.subject.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  const fileName = `${issuePrefix()}_WeybridgeChronicle_${audienceLabel}_${safeSubject || "Issue"}.pdf`;
  const path = `newsletter/${Date.now()}-${opts.broadcastId}-${audienceLabel}-${safeSubject}.pdf`;
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await renderNewsletterPdf({
      subject: opts.subject,
      targetList: AUDIENCE_TARGET_LIST[opts.audience],
      recipientCount: opts.recipientCount,
      content: opts.content,
    });
  } catch (e) {
    console.error("archiveToDocuments PDF render error:", e);
    return;
  }
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const { error: upErr } = await admin.storage.from("lodge-docs").upload(path, blob, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) {
    console.error("archiveToDocuments upload error:", upErr);
    return;
  }
  await admin.from("lodge_documents").insert({
    title: `${fileName.replace(/\.pdf$/, "")}`,
    description: `${audienceLabel} edition — sent to ${opts.recipientCount} recipient${opts.recipientCount === 1 ? "" : "s"} on ${new Date().toLocaleDateString("en-GB")}. Subject: "${opts.subject}".`,
    category: "newsletter",
    file_path: path,
    file_size_bytes: pdfBytes.byteLength,
    uploaded_by: opts.userId,
  });
}

function sectionsHaveContent(content: NewsletterContent | null | undefined): boolean {
  if (!content || !Array.isArray(content.sections) || content.sections.length === 0) return false;
  return content.sections.every((s) =>
    (s.blocks || []).some((b) =>
      (b.type === "text" && b.text?.trim()) || (b.type === "image" && b.url?.trim()),
    ),
  );
}

async function dispatchOneAudience(opts: {
  broadcastId: string;
  audience: Audience;
  subject: string;
  content: NewsletterContent;
  userId: string;
}): Promise<{ audience: Audience; sent: number; error?: string; archivedId?: string }> {
  const { audience, subject, content, userId, broadcastId } = opts;
  const targetList = AUDIENCE_TARGET_LIST[audience];

  const recipients = await getRecipients(targetList);
  if (recipients.length === 0) {
    return { audience, sent: 0, error: `No recipients found for ${AUDIENCE_LABEL[audience]}.` };
  }

  // Insert a dedicated sent-row per audience so the archive is split.
  const { data: archived, error: insErr } = await admin
    .from("newsletter_broadcasts")
    .insert({
      subject,
      target_list: targetList,
      content,
      content_visitors: {},
      status: "sending",
      sent_by: userId,
      recipient_count: recipients.length,
      audience,
    })
    .select("id")
    .single();
  if (insErr || !archived) {
    return { audience, sent: 0, error: `Failed to log ${audience} send: ${insErr?.message || "unknown"}` };
  }

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
    } else {
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
    .eq("id", archived.id);

  if (!firstError) {
    await archiveToDocuments({
      broadcastId: archived.id,
      subject,
      audience,
      content,
      userId,
      recipientCount: sentCount,
    });
  }

  return { audience, sent: sentCount, error: firstError, archivedId: archived.id };
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

    // DB is source of truth.
    const { data: row, error: rowErr } = await admin
      .from("newsletter_broadcasts")
      .select("id,status,subject,content,content_visitors,audience")
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

    const subject = (row.subject ?? "").trim();
    if (!subject) {
      return new Response(JSON.stringify({ error: "Add a subject line before broadcasting." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requested: Audience[] = Array.isArray(body.audiences) && body.audiences.length > 0
      ? Array.from(new Set(body.audiences.filter((a): a is Audience => a === "members" || a === "visitors")))
      : ["members"];

    const variants: Record<Audience, NewsletterContent> = {
      members: migrateContent(row.content),
      visitors: migrateContent(row.content_visitors),
    };

    // "Block send and warn": every requested variant must have non-empty sections.
    for (const aud of requested) {
      if (!sectionsHaveContent(variants[aud])) {
        return new Response(
          JSON.stringify({
            error: `The ${AUDIENCE_LABEL[aud]} edition has one or more empty sections. Fill every section or remove it before sending.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Mark draft as sending so the UI reflects in-flight state.
    await admin.from("newsletter_broadcasts")
      .update({ status: "sending", sent_by: userId })
      .eq("id", body.broadcastId);

    const results: Array<{ audience: Audience; sent: number; error?: string; archivedId?: string }> = [];
    for (const aud of requested) {
      const r = await dispatchOneAudience({
        broadcastId: body.broadcastId,
        audience: aud,
        subject,
        content: variants[aud],
        userId,
      });
      results.push(r);
    }

    const totalSent = results.reduce((s, r) => s + r.sent, 0);
    const errors = results.filter((r) => r.error);

    // Mark original draft row as sent (or failed) — it is the editor's working copy.
    await admin.from("newsletter_broadcasts")
      .update({
        status: errors.length === results.length ? "failed" : "sent",
        error: errors.length ? errors.map((e) => `${e.audience}: ${e.error}`).join("; ") : null,
        recipient_count: totalSent,
      })
      .eq("id", body.broadcastId);

    if (errors.length === results.length) {
      return new Response(JSON.stringify({ error: errors[0].error, results }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      recipientCount: totalSent,
      results: results.map((r) => ({ audience: r.audience, sent: r.sent, error: r.error ?? null })),
    }), {
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

