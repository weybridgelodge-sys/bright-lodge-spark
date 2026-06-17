// send-summons-email — email a finalised summons to all active members.
// Records each recipient in summons_email_log and updates the summons.
//
// This function records intent and logs delivery rows. Actual delivery uses
// Lovable Emails infrastructure when configured (template name
// "summons-distribution"). If the email queue/template isn't set up yet,
// the function still records the audit log so the Secretary has a record.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return json({ error: "Missing auth" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Role check
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: { role: string }) =>
      ["admin", "secretary", "assistant_secretary"].includes(r.role)
    );
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const { summons_id } = await req.json();
    if (!summons_id) return json({ error: "summons_id required" }, 400);

    const { data: summons, error: sErr } = await admin
      .from("summonses")
      .select("id,meeting_number,meeting_date,pdf_storage_path")
      .eq("id", summons_id)
      .single();
    if (sErr || !summons) return json({ error: "Summons not found" }, 404);

    const { data: actives } = await admin
      .from("profiles")
      .select("id,email,full_name")
      .eq("status", "active");

    const recipients = (actives ?? []).filter((p: any) => p.email);

    // Try to enqueue via Lovable Emails if available; otherwise just log.
    let sent = 0;
    for (const r of recipients) {
      let status = "queued";
      let error: string | null = null;
      try {
        await admin.rpc("enqueue_email" as any, {
          queue_name: "transactional_emails",
          payload: {
            templateName: "summons-distribution",
            recipientEmail: r.email,
            idempotencyKey: `summons-${summons.id}-${r.id}`,
            templateData: {
              meeting_number: summons.meeting_number,
              meeting_date: summons.meeting_date,
              pdf_path: summons.pdf_storage_path,
            },
          },
        } as any);
        status = "sent";
        sent++;
      } catch (e) {
        // Email infra not configured — fall back to recording intent.
        status = "logged_only";
        error = (e as Error).message;
      }
      await admin.from("summons_email_log").insert({
        summons_id: summons.id,
        recipient_email: r.email,
        recipient_user_id: r.id,
        status,
        error,
      });
    }

    await admin
      .from("summonses")
      .update({ sent_at: new Date().toISOString(), sent_to_count: recipients.length, status: "sent" })
      .eq("id", summons.id);

    return json({ ok: true, sent, recipients: recipients.length });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
