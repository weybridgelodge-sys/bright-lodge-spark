// submit-installation-return — emails the generated UGLE Installation Return to the
// Provincial Office (address from module_settings, never from the browser) and logs
// who sent it, when and to whom. Restricted to admin / Secretary.
// Attachments aren't supported by the email service, so the PDF goes as a signed link.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { sendTransactionalEmail } from "../_shared/send-email.ts";

const SETTING = "installation_return_province_email";
const LINK_DAYS = 30;
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({
  lodge_year: z.number().int().min(2000).max(2100),
  storage_path: z.string().regex(/^installation-returns\/\d{4}\/[\w.-]+\.pdf$/),
  recipient_email: z.string().email().max(255),
  secretary_changed: z.enum(["Y", "N", ""]).optional(),
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
    if (!b.storage_path.startsWith(`installation-returns/${b.lodge_year}/`)) return json({ error: "File does not match the year." }, 400);

    const { data: setting } = await admin.from("module_settings").select("value").eq("key", SETTING).maybeSingle();
    const configured = typeof setting?.value === "string" ? setting.value.trim().toLowerCase() : "";
    if (!configured) return json({ error: "The Provincial Office email address hasn't been set yet." }, 400);
    if (configured !== b.recipient_email.trim().toLowerCase()) {
      return json({ error: "The Provincial Office address changed since you opened the confirmation. Please review and try again." }, 409);
    }

    const { data: signed, error: sErr } = await admin.storage.from("secretary-returns").createSignedUrl(b.storage_path, LINK_DAYS * 86400, {
      download: `Installation-Return-6787-${b.lodge_year}.pdf`,
    });
    if (sErr || !signed?.signedUrl) return json({ error: "The generated PDF could not be found." }, 400);

    const { data: prof } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    const senderName = prof?.full_name ?? user.email ?? "";
    const yearLabel = `${b.lodge_year}/${String(b.lodge_year + 1).slice(2)}`;
    const expires = new Date(Date.now() + LINK_DAYS * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
    const submissionId = crypto.randomUUID();

    const res = await sendTransactionalEmail({
      templateName: "installation-return-submission",
      recipientEmail: configured,
      idempotencyKey: `installation-return-${submissionId}`,
      replyTo: "secretary@weybridgelodge.org.uk",
      templateData: {
        yearLabel,
        installationDate: b.installation_date ?? "",
        senderName,
        senderOffice: isCurSec || isSec ? "Secretary" : "on behalf of the Secretary",
        url: signed.signedUrl,
        expiresOn: expires,
      },
    });
    if (!res.ok) return json({ error: "The email could not be sent. Nothing was recorded — please try again." }, 502);
    if ((res.result as any)?.success === false) return json({ error: "The Provincial Office address is blocked from receiving our emails (it previously bounced or unsubscribed)." }, 422);

    const { data: row, error: lErr } = await admin.from("installation_return_submissions").insert({
      id: submissionId,
      lodge_year: b.lodge_year,
      sent_by: user.id,
      sent_by_name: senderName,
      recipient_email: configured,
      storage_path: b.storage_path,
      secretary_changed: b.secretary_changed || null,
    }).select().single();
    if (lErr) console.error("submission log failed", lErr.message);
    return json({ ok: true, submission: row });
  } catch (e) {
    console.error(e);
    return json({ error: "Unexpected error" }, 500);
  }
});
