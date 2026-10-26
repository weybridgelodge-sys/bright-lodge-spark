// notify-poll-opened — email all active members that a new poll is open.
// Invoked from PollsAdmin.tsx right after a poll row is created. Fires once
// per poll; not per vote. Reuses the same "all active members" recipient
// pattern as send-summons-email.

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendTransactionalEmail } from "../_shared/send-email.ts";
import { loadLodgeSettings } from "../_shared/lodgeSettings.ts";
import { loadCallerUnit, noCallerUnitMessage } from "../_shared/callerUnit.ts";
import { runUnit } from "./run.ts";

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

    if (test_recipient && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(test_recipient)) {
      return json({ error: "Invalid test_recipient email" }, 400);
    }
    // The caller's own lodge decides recipients, links and branding; blank = refuse.
    const unitId = await loadCallerUnit(admin, user.id);
    if (!unitId) return json({ error: noCallerUnitMessage("send poll notices") }, 403);
    const lodge = await loadLodgeSettings(unitId);
    const push = async (b: Record<string, unknown>) => {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify(b),
      });
      return await r.json().catch(() => ({}));
    };
    const result = await runUnit({ db: admin, send: sendTransactionalEmail as any, push }, unitId, lodge, poll, test_recipient || null);
    return json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
