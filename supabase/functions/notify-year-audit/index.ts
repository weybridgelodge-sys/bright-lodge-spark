// notify-year-audit — emails for Year End audit sign-off.
// Reads the approval's actual state server-side and emails accordingly:
//   submitted -> both current auditors (only if the caller submitted it)
//   query / approved -> current Treasurer (only if the caller signed this round)
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendTransactionalEmail } from "../_shared/send-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const URL_BASE = "https://weybridgelodge.org.uk";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const URL_ = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { approval_id } = await req.json().catch(() => ({}));
    if (!approval_id) return json({ error: "approval_id required" }, 400);
    const { data: a } = await admin.from("treasurer_year_approvals")
      .select("id,masonic_year,status,round_number,submitted_by").eq("id", approval_id).maybeSingle();
    if (!a) return json({ error: "Not found" }, 404);

    const y = a.masonic_year as number;
    const yearLabel = `FY ${y}/${String(y + 1).slice(2)}`;
    const yearEnd = `30 September ${y + 1}`;
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

    // Current holders by the officers' (Installation) year, carrying non-progressive offices forward.
    const appts: { member_id: string; position_key: string }[] = [];
    for (const key of roles) {
      const { data: id } = await admin.rpc("current_officer_holder", { _position_key: key });
      if (id) appts.push({ member_id: id as unknown as string, position_key: key });
    }
    const ids = [...new Set([...(appts ?? []).map((x: any) => x.member_id), ...(actorId ? [actorId] : [])])];
    const { data: profs } = await admin.from("profiles").select("id,email,full_name").in("id", ids);
    const actor = profs?.find((p: any) => p.id === actorId)?.full_name ?? "";
    const OFFICE: Record<string, string> = { auditor_1: "Auditor", auditor_2: "Auditor", treasurer: "Treasurer" };

    let sent = 0; const failures: string[] = [];
    for (const ap of appts ?? []) {
      const email = profs?.find((p: any) => p.id === ap.member_id)?.email;
      if (!email) continue;
      const res = await sendTransactionalEmail({
        templateName: "year-audit-update",
        recipientEmail: email,
        idempotencyKey: `year-audit-${a.id}-r${a.round_number}-${kind}-${ap.member_id}`,
        templateData: {
          kind, yearLabel, yearEnd, round: a.round_number, actor, note, office: OFFICE[ap.position_key],
          url: kind === "review_needed" ? `${URL_BASE}/members` : `${URL_BASE}/members/admin/treasurer`,
        },
      });
      if (res.ok) sent++; else failures.push(email);
    }
    return json({ ok: true, sent, failures });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
