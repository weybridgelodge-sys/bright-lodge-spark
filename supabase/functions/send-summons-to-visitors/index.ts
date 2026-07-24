// send-summons-to-visitors — email a finalised summons to visitor contacts.
// Personalised salutation per recipient, branded HTML matching the shared
// Weybridge Lodge transactional email style (centered crest, "Weybridge
// Lodge" heading, gold "No. 6787 — Province of Surrey" subtitle, white body),
// with the summons PDF + .ics calendar file attached.
//
// Role-gated to admin / secretary / worshipful_master and logged into
// summons_email_log so history clearly shows which visitors were invited.

import { createClient } from "npm:@supabase/supabase-js@2";
import { BRAND, LOGO_URL } from "../_shared/transactional-email-templates/_brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_ADDRESS = "Weybridge Lodge <notify@events.weybridgelodge.org.uk>";

type Recipient = { email: string; salutation: string; visitor_contact_id?: string | null };

interface Body {
  summons_id: string;
  recipients: Recipient[];
  meeting_date_label: string;     // e.g. "Saturday 12 September 2026"
  meeting_time_label?: string;    // e.g. "6:15 pm for 6:45 pm"
  meeting_type_label?: string;    // e.g. "Regular Meeting"
  venue: string;                  // e.g. "Masonic Centre, Guildford"
  secretary_display_name?: string; // preferred — resolved from officer_appointments client-side
  wm_display_name?: string;        // legacy — accepted for back-compat but no longer displayed
  ics: string;
  ics_filename: string;
  event_start_iso: string;
  event_end_iso?: string;
}

function json(b: unknown, status = 200): Response {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function b64(str: string): string { return btoa(unescape(encodeURIComponent(str))); }
function bytesToB64(bytes: Uint8Array): string {
  let s = ""; const c = 0x8000;
  for (let i = 0; i < bytes.length; i += c) s += String.fromCharCode(...bytes.subarray(i, i + c));
  return btoa(s);
}
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function isEmail(v: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

function renderHtml(o: {
  salutation: string;
  meetingDateLabel: string;
  meetingTimeLabel?: string;
  meetingTypeLabel?: string;
  venue: string;
  secretaryName: string;
  unsubscribeUrl?: string;
}): string {
  // Style matches the shared brand (see supabase/functions/_shared/transactional-email-templates/_brand.ts
  // and almoner-overdue-digest.tsx): white body, centered crest, navy "Weybridge Lodge" title
  // with a gold "No. 6787 — Province of Surrey" subtitle, then Arial body copy.
  const detailRow = (label: string, value: string) => `
    <tr>
      <td style="padding:4px 12px 4px 0;color:${BRAND.muted};font-size:14px;vertical-align:top;">${esc(label)}</td>
      <td style="padding:4px 0;color:#111;font-size:14px;"><strong>${esc(value)}</strong></td>
    </tr>`;
  const typeLine = o.meetingTypeLabel ? detailRow("Meeting", o.meetingTypeLabel) : "";
  const timeLine = o.meetingTimeLabel ? detailRow("Time", o.meetingTimeLabel) : "";

  return `<!doctype html><html><body style="margin:0;padding:0;background:${BRAND.bg};font-family:${BRAND.fontStack};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.bg};">
    <tr><td align="center">
      <table role="presentation" width="${parseInt(BRAND.containerMaxWidth, 10)}" cellspacing="0" cellpadding="0" style="max-width:${BRAND.containerMaxWidth};margin:0 auto;padding:24px;">
        <tr><td align="center" style="padding:8px 0 16px;">
          <img src="${LOGO_URL}" width="120" height="120" alt="Weybridge Lodge crest" style="display:block;margin:0 auto;" />
          <h1 style="color:${BRAND.navy};font-size:24px;margin:12px 0 0;letter-spacing:0.5px;font-family:${BRAND.fontStack};">Weybridge Lodge</h1>
          <div style="color:${BRAND.gold};font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:4px 0 12px;">No. 6787 — Province of Surrey</div>
        </td></tr>
        <tr><td style="padding:0;">
          <h2 style="color:${BRAND.navy};font-size:22px;margin:0 0 6px;font-family:${BRAND.fontStack};">Invitation to our next Meeting</h2>
          <p style="color:${BRAND.body};font-size:14px;line-height:1.55;margin:14px 0;">Dear ${esc(o.salutation)},</p>
          <p style="color:${BRAND.body};font-size:14px;line-height:1.55;margin:0 0 14px;">
            On behalf of the Worshipful Master and the Brethren of Weybridge Lodge No. 6787,
            I am pleased to invite you to our next meeting. The Summons is attached along
            with a calendar file so you can add the event to your diary.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:12px 0 16px 0;background:${BRAND.panel};border:1px solid ${BRAND.hairline};border-radius:4px;padding:8px 16px;">
            ${typeLine}
            ${detailRow("Date", o.meetingDateLabel)}
            ${timeLine}
            ${detailRow("Where", o.venue)}
          </table>
          <p style="color:${BRAND.body};font-size:14px;line-height:1.55;margin:16px 0 8px;">We very much look forward to seeing you at the meeting.</p>
          <p style="color:${BRAND.body};font-size:14px;line-height:1.55;margin:0 0 4px;">Kind regards</p>
          <p style="color:${BRAND.body};font-size:14px;line-height:1.55;margin:0 0 14px;">S&amp;F</p>
          <p style="margin:0;color:${BRAND.navy};font-size:14px;"><strong>${esc(o.secretaryName)}</strong>, Secretary</p>
          <p style="margin:0;color:${BRAND.navy};font-size:14px;">Weybridge Lodge No. 6787</p>
          <hr style="border:none;border-top:1px solid ${BRAND.hairline};margin:20px 0 10px;" />
          <p style="color:${BRAND.muted};font-size:12px;margin:0;">
            ${o.unsubscribeUrl
              ? `If you would prefer not to receive further invitations, <a href="${esc(o.unsubscribeUrl)}" style="color:${BRAND.gold};">click here to unsubscribe</a> from future Weybridge Lodge emails.`
              : `If you would prefer not to receive further invitations, please let the Secretary know and we will remove you from our visitor list.`}
          </p>

        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) return json({ error: "Email provider not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing auth" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: { role: string }) =>
      ["admin", "secretary", "worshipful_master", "assistant_secretary"].includes(r.role)
    );
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.summons_id || !Array.isArray(body.recipients) || body.recipients.length === 0) {
      return json({ error: "summons_id and recipients required" }, 400);
    }
    if (body.recipients.length > 500) return json({ error: "Too many recipients" }, 400);
    const secretaryName = (body.secretary_display_name || "").trim() || "The Secretary";
    if (!body.ics || !body.ics_filename || !body.meeting_date_label || !body.venue) {
      return json({ error: "Missing meeting/ics fields" }, 400);
    }

    // Load summons + PDF
    const { data: summons, error: sErr } = await admin
      .from("summonses")
      .select("id,meeting_number,pdf_storage_path")
      .eq("id", body.summons_id)
      .single();
    if (sErr || !summons) return json({ error: "Summons not found" }, 404);
    if (!summons.pdf_storage_path) return json({ error: "Summons has no PDF — save it first" }, 400);

    const { data: pdfFile, error: dErr } = await admin.storage
      .from("lodge-docs").download(summons.pdf_storage_path);
    if (dErr || !pdfFile) return json({ error: `PDF fetch failed: ${dErr?.message ?? "unknown"}` }, 500);
    const pdfB64 = bytesToB64(new Uint8Array(await pdfFile.arrayBuffer()));

    const icsB64 = b64(body.ics.replace(/METHOD:REQUEST/g, "METHOD:PUBLISH"));

    // Suppression list check
    const emails = body.recipients.map((r) => (r.email || "").toLowerCase()).filter(isEmail);
    const { data: suppressed } = await admin.from("suppressed_emails").select("email").in("email", emails);
    const blocked = new Set((suppressed ?? []).map((r: any) => r.email));

    // Load unsubscribe tokens for each recipient — by visitor_contact_id when
    // provided, otherwise by lowercased email. `unsubscribe_token` is non-null
    // in the schema so every visitor_contacts row has one.
    const ids = body.recipients.map((r) => r.visitor_contact_id).filter(Boolean) as string[];
    const tokenByEmail = new Map<string, string>();
    const tokenById = new Map<string, string>();
    if (ids.length) {
      const { data } = await admin.from("visitor_contacts").select("id,email,unsubscribe_token").in("id", ids);
      for (const row of data ?? []) {
        if (row.unsubscribe_token) {
          tokenById.set(row.id, row.unsubscribe_token);
          if (row.email) tokenByEmail.set(String(row.email).toLowerCase(), row.unsubscribe_token);
        }
      }
    }
    if (emails.length) {
      const { data } = await admin.from("visitor_contacts").select("email,unsubscribe_token").in("email", emails);
      for (const row of data ?? []) {
        if (row.unsubscribe_token && row.email && !tokenByEmail.has(String(row.email).toLowerCase())) {
          tokenByEmail.set(String(row.email).toLowerCase(), row.unsubscribe_token);
        }
      }
    }

    const subject = `Invitation — Weybridge Lodge No. 6787 — ${body.meeting_date_label}`;
    let sent = 0;
    const failures: { email: string; error: string }[] = [];

    for (const r of body.recipients) {
      const email = (r.email || "").trim();
      if (!isEmail(email)) { failures.push({ email, error: "invalid email" }); continue; }
      if (blocked.has(email.toLowerCase())) {
        failures.push({ email, error: "suppressed" });
        await admin.from("summons_email_log").insert({
          summons_id: summons.id, recipient_email: email, status: "suppressed",
        });
        continue;
      }
      const salutation = (r.salutation || "").trim() || "Brother";
      const token = (r.visitor_contact_id && tokenById.get(r.visitor_contact_id))
        || tokenByEmail.get(email.toLowerCase())
        || "";
      const unsubscribeUrl = token
        ? `${SUPABASE_URL}/functions/v1/newsletter-unsubscribe?token=${encodeURIComponent(token)}`
        : undefined;
      const html = renderHtml({
        salutation,
        meetingDateLabel: body.meeting_date_label,
        meetingTimeLabel: body.meeting_time_label,
        meetingTypeLabel: body.meeting_type_label,
        venue: body.venue,
        secretaryName,
        unsubscribeUrl,
      });
      try {
        const contentDigest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(
            `${subject}|${salutation}|${body.meeting_date_label}|${body.meeting_time_label ?? ""}|${body.meeting_type_label ?? ""}|${body.venue}|${secretaryName}|${html.length}|${pdfB64.length}|${icsB64.length}`
          ),
        );
        const contentHash = Array.from(new Uint8Array(contentDigest))
          .slice(0, 8)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const res = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
            "Idempotency-Key": `summons-visitors-${summons.id}-${email}-${contentHash}`,
          },
          body: JSON.stringify({
            from: FROM_ADDRESS,
            to: [email],
            subject,
            html,
            attachments: [
              { filename: body.ics_filename, content: icsB64, content_type: "text/calendar; charset=UTF-8" },
              { filename: `summons-${summons.meeting_number}.pdf`, content: pdfB64, content_type: "application/pdf" },
            ],
          }),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((out as any)?.message || `HTTP ${res.status}`);
        sent++;
        await admin.from("summons_email_log").insert({
          summons_id: summons.id, recipient_email: email, status: "sent",
        });
      } catch (e) {
        const msg = (e as Error).message;
        failures.push({ email, error: msg });
        await admin.from("summons_email_log").insert({
          summons_id: summons.id, recipient_email: email, status: "failed", error: msg,
        });
      }
    }

    if (sent > 0) {
      await admin.from("summonses")
        .update({ visitors_notified_at: new Date().toISOString(), visitors_notified_count: sent })
        .eq("id", summons.id);
    }

    return json({ ok: true, sent, recipients: body.recipients.length, failures });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
