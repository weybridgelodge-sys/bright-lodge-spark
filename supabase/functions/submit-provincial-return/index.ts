// submit-provincial-return — emails the generated Provincial (Surrey) Installation Return to the
// Provincial Grand Secretary (address from module_settings key provincial_return_province_email,
// never from the browser) and logs who sent it, when and to whom. Admin / Secretary only.
// The email service can't attach files, so the Word and PDF go as signed 30-day links.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { sendTransactionalEmail } from "../_shared/send-email.ts";

const SETTING = "provincial_return_province_email";
const LINK_DAYS = 30;
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({
  lodge_year: z.number().int().min(2000).max(2100),
  pdf_path: z.string().regex(/^provincial-returns\/\d{4}\/[\w.-]+\.pdf$/),
  docx_path: z.string().regex(/^provincial-returns\/\d{4}\/[\w.-]+\.docx$/),
  recipient_email: z.string().email().max(255),
  installation_date: z.string().max(20).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const URL_ = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Please sign in again." }, 401);

    const [{ data: isAdmin }, { data: isSec }, { data: isCurSec }] = await Promise.all([
      admin.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      admin.rpc("has_role", { _user_id: user.id, _role: "secretary" }),
      admin.rpc("is_current_officer", { _user_id: user.id, _position_key: "secretary" }),
    ]);
    if (!(isAdmin || isSec || isCurSec)) return json({ error: "Only the Secretary or an administrator can submit the return." }, 403);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }, 400);
    const b = parsed.data;
    const prefix = `provincial-returns/${b.lodge_year}/`;
    if (!b.pdf_path.startsWith(prefix) || !b.docx_path.startsWith(prefix)) return json({ error: "Files do not match the year." }, 400);

    const { data: setting } = await admin.from("module_settings").select("value").eq("key", SETTING).maybeSingle();
    const configured = typeof setting?.value === "string" ? setting.value.trim().toLowerCase() : "";
    if (!configured) return json({ error: "The Provincial Grand Secretary's email address hasn't been set yet." }, 400);
    if (configured !== b.recipient_email.trim().toLowerCase()) {
      return json({ error: "The Provincial Grand Secretary's address changed since you opened the confirmation. Please review and try again." }, 409);
    }

    const bucket = admin.storage.from("secretary-returns");
    const [pdf, docx] = await Promise.all([
      bucket.createSignedUrl(b.pdf_path, LINK_DAYS * 86400, { download: `L6787-Provincial-Return-${b.lodge_year}.pdf` }),
      bucket.createSignedUrl(b.docx_path, LINK_DAYS * 86400, { download: `L6787-Provincial-Return-${b.lodge_year}.docx` }),
    ]);
    if (pdf.error || docx.error || !pdf.data?.signedUrl || !docx.data?.signedUrl) return json({ error: "The generated files could not be found." }, 400);

    const { data: prof } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    const senderName = prof?.full_name ?? user.email ?? "";
    const yearLabel = `${b.lodge_year}/${String(b.lodge_year + 1).slice(2)}`;
    const expires = new Date(Date.now() + LINK_DAYS * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
    const submissionId = crypto.randomUUID();

    const res = await sendTransactionalEmail({
      templateName: "provincial-return-submission",
      recipientEmail: configured,
      idempotencyKey: `provincial-return-${submissionId}`,
      replyTo: "secretary@weybridgelodge.org.uk",
      templateData: {
        yearLabel,
        installationDate: b.installation_date ?? "",
        senderName,
        senderOffice: isCurSec || isSec ? "Secretary" : "on behalf of the Secretary",
        wordUrl: docx.data.signedUrl,
        pdfUrl: pdf.data.signedUrl,
        expiresOn: expires,
      },
    });
    if (!res.ok) return json({ error: "The email could not be sent. Nothing was recorded — please try again." }, 502);
    if ((res.result as any)?.success === false) return json({ error: "The Provincial Grand Secretary's address is blocked from receiving our emails (it previously bounced or unsubscribed)." }, 422);

    const { data: row, error: lErr } = await admin.from("provincial_return_submissions").insert({
      id: submissionId,
      lodge_year: b.lodge_year,
      sent_by: user.id,
      sent_by_name: senderName,
      recipient_email: configured,
      storage_path: b.pdf_path,
    }).select().single();
    if (lErr) console.error("submission log failed", lErr.message);
    return json({ ok: true, submission: row });
  } catch (e) {
    console.error(e);
    return json({ error: "Unexpected error" }, 500);
  }
});
