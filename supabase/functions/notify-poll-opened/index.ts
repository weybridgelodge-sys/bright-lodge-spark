// notify-poll-opened — email all active members that a new poll is open.
// Invoked from PollsAdmin.tsx right after a poll row is created. Fires once
// per poll; not per vote. Reuses the same "all active members" recipient
// pattern as send-summons-email.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    // Role check: same officers who can create polls.
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: { role: string }) =>
      ["admin", "secretary", "worshipful_master"].includes(r.role)
    );
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const poll_id: string | undefined = body.poll_id;
    const test_recipient: string | undefined = body.test_recipient?.trim();
    if (!poll_id) return json({ error: "poll_id required" }, 400);

    const { data: poll, error: pErr } = await admin
      .from("polls")
      .select("id,question,options,closes_at,results_visibility,status")
      .eq("id", poll_id)
      .maybeSingle();
    if (pErr || !poll) return json({ error: "Poll not found" }, 404);

    const question = (poll as any).question as string;
    const options = ((poll as any).options as string[]) ?? [];
    const closesAt = (poll as any).closes_at as string | null;
    const liveResults = (poll as any).results_visibility === "live";
    const dashboardUrl = "https://weybridgelodge.org.uk/members/dashboard";

    const isTest = !!test_recipient;
    let recipients: { email: string; user_id: string | null }[] = [];
    if (isTest) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(test_recipient!)) {
        return json({ error: "Invalid test_recipient email" }, 400);
      }
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

    if (recipients.length === 0) return json({ ok: true, sent: 0, recipients: 0 });

    const testRunId = isTest ? crypto.randomUUID() : "";
    let sent = 0;
    const failures: { email: string; error: string }[] = [];

    for (const r of recipients) {
      const idempotencyKey = isTest
        ? `poll-open-${poll.id}-test-${testRunId}-${r.email}`
        : `poll-open-${poll.id}-${r.email}`;
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
          body: JSON.stringify({
            templateName: "poll-opened",
            recipientEmail: r.email,
            idempotencyKey,
            templateData: {
              question,
              options,
              dashboardUrl,
              closesAt,
              liveResults,
            },
          }),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((result as any)?.error || `HTTP ${res.status}`);
        sent++;
      } catch (e) {
        failures.push({ email: r.email, error: (e as Error).message });
      }
    }

    return json({ ok: true, test: isTest, sent, recipients: recipients.length, failures });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
