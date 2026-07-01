// send-summons-email — distribute a finalised summons by email.
// Two modes:
//  - test:  { summons_id, test_recipient: "addr@x" }  → sends a single test
//  - live:  { summons_id }                            → sends to all active members
// Each send goes through send-transactional-email using the
// "summons-distribution" template. A 30-day signed download URL is generated
// for the PDF stored in the lodge-docs bucket.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SIGNED_URL_TTL = 60 * 60 * 24 * 30; // 30 days

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatMeetingDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing auth" }, 401);

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

    const body = await req.json().catch(() => ({}));
    const summons_id: string | undefined = body.summons_id;
    const test_recipient: string | undefined = body.test_recipient?.trim();
    const secretary_name_override: string | undefined = body.secretary_name;
    if (!summons_id) return json({ error: "summons_id required" }, 400);

    const isTest = !!test_recipient;
    if (isTest && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(test_recipient!)) {
      return json({ error: "Invalid test_recipient email" }, 400);
    }

    const { data: summons, error: sErr } = await admin
      .from("summonses")
      .select("id,meeting_number,meeting_date,pdf_storage_path")
      .eq("id", summons_id)
      .single();
    if (sErr || !summons) return json({ error: "Summons not found" }, 404);
    if (!summons.pdf_storage_path) {
      return json({ error: "Summons has no PDF — save it first" }, 400);
    }

    // Signed URL for the PDF
    const { data: signed, error: signErr } = await admin.storage
      .from("lodge-docs")
      .createSignedUrl(summons.pdf_storage_path, SIGNED_URL_TTL, {
        download: `summons-${summons.meeting_number}.pdf`,
      });
    if (signErr || !signed?.signedUrl) {
      return json({ error: signErr?.message ?? "Failed to sign PDF URL" }, 500);
    }
    const pdfUrl = signed.signedUrl;

    // Resolve recipients
    let recipients: { email: string; user_id: string | null }[] = [];
    if (isTest) {
      recipients = [{ email: test_recipient!, user_id: null }];
    } else {
      const { data: actives } = await admin
        .from("profiles")
        .select("id,email")
        .eq("status", "active");
      recipients = (actives ?? [])
        .filter((p: any) => !!p.email)
        .map((p: any) => ({ email: p.email, user_id: p.id }));
    }

    if (recipients.length === 0) {
      return json({ error: "No recipients" }, 400);
    }

    // Resolve secretary display name from current officers
    let secretaryName = secretary_name_override || "";
    let secretaryTitle = "";
    if (!secretary_name_override) {
      const { data: yearRow } = await admin.rpc("current_lodge_year");
      const lodgeYear = (yearRow as unknown as number) ?? new Date().getFullYear();
      const { data: appt } = await admin
        .from("officer_appointments")
        .select("member_id")
        .eq("lodge_year", lodgeYear)
        .eq("position_key", "secretary")
        .maybeSingle();
      if (appt?.member_id) {
        const { data: prof } = await admin
          .from("profiles")
          .select("title,first_name,last_name,full_name")
          .eq("id", appt.member_id)
          .maybeSingle();
        if (prof) {
          const p: any = prof;
          secretaryTitle = p.title ? (p.title.endsWith(".") ? p.title : `${p.title}.`) : "";
          const fname = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
          secretaryName = fname || (p.full_name || "").replace(/^(W\s*Bro\.?|Bro\.?|RW\s*Bro\.?)\s*/i, "").trim();
        }
      }
    }
    if (!secretaryName) secretaryName = "The Secretary";

    const meetingDateLabel = formatMeetingDate(summons.meeting_date);

    let sent = 0;
    const failures: { email: string; error: string }[] = [];

    const testRunId = isTest ? crypto.randomUUID() : "";

    for (const r of recipients) {
      const idempotencyKey = isTest
        ? `summons-${summons.id}-test-${testRunId}-${r.email}`
        : `summons-${summons.id}-${r.email}`;
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
          body: JSON.stringify({
            templateName: "summons-distribution",
            recipientEmail: r.email,
            idempotencyKey,
            templateData: {
              meetingDateLabel,
              meetingNumber: summons.meeting_number,
              pdfUrl,
              secretaryName,
              secretaryTitle,
              secretaryOffice: "Secretary",
              isTest,
            },
          }),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((result as any)?.error || `HTTP ${res.status}`);

        await admin.from("summons_email_log").insert({
          summons_id: summons.id,
          recipient_email: r.email,
          recipient_user_id: r.user_id,
          status: isTest ? "test_sent" : "sent",
        });
        sent++;
      } catch (e) {
        const msg = (e as Error).message;
        failures.push({ email: r.email, error: msg });
        await admin.from("summons_email_log").insert({
          summons_id: summons.id,
          recipient_email: r.email,
          recipient_user_id: r.user_id,
          status: "failed",
          error: msg,
        });
      }
    }

    if (!isTest && sent > 0) {
      await admin
        .from("summonses")
        .update({
          sent_at: new Date().toISOString(),
          sent_to_count: sent,
          status: "sent",
        })
        .eq("id", summons.id);
    }

    return json({ ok: true, test: isTest, sent, recipients: recipients.length, failures });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
