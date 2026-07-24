// send-summons-to-visitors — email a finalised summons to visitor contacts.
// Personalised salutation per recipient, branded HTML (navy/gold + crest),
// summons PDF + .ics calendar file attached.
//
// Role-gated to admin / secretary / worshipful_master and logged into
// summons_email_log so history clearly shows which visitors were invited.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_ADDRESS = "Weybridge Lodge <notify@events.weybridgelodge.org.uk>";
const LOGO_URL =
  "https://bright-lodge-spark.lovable.app/__l5e/assets-v1/7caf0014-2e5c-4614-8622-ee60d204fdcc/weybridge-logo-navy-transparent.png";

type Recipient = { email: string; salutation: string; visitor_contact_id?: string | null };

interface Body {
  summons_id: string;
  recipients: Recipient[];
  meeting_date_label: string;     // e.g. "Saturday 12 September 2026"
  meeting_time_label?: string;    // e.g. "6:15 pm for 6:45 pm"
  meeting_type_label?: string;    // e.g. "Regular Meeting"
  venue: string;                  // e.g. "Masonic Centre, Guildford"
  wm_display_name: string;        // resolved from officer_appointments client-side
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
  wmName: string;
}): string {
  const timeLine = o.meetingTimeLabel
    ? `<tr><td style="padding:4px 12px 4px 0;color:#5b5b5b;font-size:14px;">Time</td><td style="padding:4px 0;color:#111;font-size:14px;"><strong>${esc(o.meetingTimeLabel)}</strong></td></tr>`
    : "";
  const typeLine = o.meetingTypeLabel
    ? `<tr><td style="padding:4px 12px 4px 0;color:#5b5b5b;font-size:14px;">Meeting</td><td style="padding:4px 0;color:#111;font-size:14px;"><strong>${esc(o.meetingTypeLabel)}</strong></td></tr>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f7f4ee;font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #e5e0d3;border-radius:4px;">
        <tr><td align="center" style="padding:24px 28px 8px;background:#1B2A4A;">
          <img src="${LOGO_URL}" width="90" height="90" alt="Weybridge Lodge crest" style="display:block;margin:0 auto 8px;" />
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#C9A432;">Weybridge Lodge No. 6787</div>
          <h1 style="margin:6px 0 0 0;font-size:22px;color:#fff;font-family:Georgia,serif;">Invitation to our next Meeting</h1>
        </td></tr>
        <tr><td style="padding:24px 28px;color:#222;font-size:15px;line-height:1.6;font-family:Arial,sans-serif;">
          <p style="margin:0 0 14px 0;">Dear ${esc(o.salutation)},</p>
          <p style="margin:0 0 14px 0;">
            It is my pleasure, on behalf of the Worshipful Master and the Brethren of
            Weybridge Lodge No. 6787, to invite you to our next meeting. The Summons
            is attached along with a calendar file so you can add the event to your diary.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:12px 0 16px 0;">
            ${typeLine}
            <tr><td style="padding:4px 12px 4px 0;color:#5b5b5b;font-size:14px;">Date</td><td style="padding:4px 0;color:#111;font-size:14px;"><strong>${esc(o.meetingDateLabel)}</strong></td></tr>
            ${timeLine}
            <tr><td style="padding:4px 12px 4px 0;color:#5b5b5b;font-size:14px;vertical-align:top;">Where</td><td style="padding:4px 0;color:#111;font-size:14px;"><strong>${esc(o.venue)}</strong></td></tr>
          </table>
          <p style="margin:16px 0 8px 0;">We very much look forward to seeing you at the meeting.</p>
          <p style="margin:0 0 4px 0;">Kind regards</p>
          <p style="margin:0 0 14px 0;">S&amp;F</p>
          <p style="margin:0;color:#1B2A4A;"><strong>${esc(o.wmName)}</strong>, Worshipful Master</p>
          <p style="margin:0;color:#1B2A4A;">Weybridge Lodge No. 6787</p>
        </td></tr>
        <tr><td style="padding:16px 28px;background:#faf7f1;color:#5b5b5b;font-size:12px;border-top:1px solid #e5e0d3;font-family:Arial,sans-serif;">
          If you would prefer not to receive further invitations, please reply to this email and we will remove you from our visitor list.
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
    if (!body.ics || !body.ics_filename || !body.meeting_date_label || !body.venue || !body.wm_display_name) {
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
      const html = renderHtml({
        salutation,
        meetingDateLabel: body.meeting_date_label,
        meetingTimeLabel: body.meeting_time_label,
        meetingTypeLabel: body.meeting_type_label,
        venue: body.venue,
        wmName: body.wm_display_name,
      });
      try {
        const res = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
            "Idempotency-Key": `summons-visitors-${summons.id}-${email}`,
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
