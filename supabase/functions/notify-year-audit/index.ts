// notify-year-audit — emails for Year End audit sign-off.
// Reads the approval's actual state server-side and emails accordingly:
//   submitted -> both current auditors (only if the caller submitted it)
//   query / approved -> current Treasurer (only if the caller signed this round)
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
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const URL_ = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    // The caller's own lodge decides recipients, links and branding; blank = refuse.
    const unitId = await loadCallerUnit(admin, user.id);
    if (!unitId) return json({ error: noCallerUnitMessage("send audit notices") }, 403);

    const { approval_id } = await req.json().catch(() => ({}));
    if (!approval_id) return json({ error: "approval_id required" }, 400);
    const { data: a } = await admin.from("treasurer_year_approvals")
      .select("id,masonic_year,status,round_number,submitted_by").eq("id", approval_id).maybeSingle();
    if (!a) return json({ error: "Not found" }, 404);
    const { data: sigs } = await admin.from("treasurer_year_signoffs")
      .select("officer_role,signed_by,decision,note").eq("approval_id", a.id).eq("round_number", a.round_number);

    let roles: string[]; let kind: string; let note = ""; let actorId: string | null = null;
    if (a.status === "submitted") {
      if (a.submitted_by !== user.id) return json({ error: "Not the submitter" }, 403);
      roles = ["auditor_1", "auditor_2"]; kind = "review_needed"; actorId = a.submitted_by;
    } else if (a.status === "query" || a.status === "approved") {
      if (!(sigs ?? []).some((s: any) => s.signed_by === user.id)) return json({ error: "Not a signer" }, 403);
      roles = ["treasurer"]; kind = a.status;
      const q = (sigs ?? []).find((s: any) => s.decision === "query");
      if (q) { note = q.note ?? ""; actorId = q.signed_by; }
    } else return json({ ok: true, sent: 0 });

    const lodge = await loadLodgeSettings(unitId);
    const result = await runUnit({ db: admin, send: sendTransactionalEmail as any }, unitId, lodge, a, roles, kind, note, actorId);
    return json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
