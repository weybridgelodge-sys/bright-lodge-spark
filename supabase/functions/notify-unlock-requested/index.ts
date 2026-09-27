// notify-unlock-requested — one-off email to the current Treasurer / Secretary
// office holders (officer_appointments) when a period unlock is requested.
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendTransactionalEmail } from "../_shared/send-email.ts";

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
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { period_id } = await req.json().catch(() => ({}));
    if (!period_id) return json({ error: "period_id required" }, 400);

    const { data: p } = await admin.from("treasurer_periods")
      .select("id,label,status,unlock_requested_by,unlock_requested_at,unlock_reason")
      .eq("id", period_id).maybeSingle();
    // Only the actual requester can trigger the email, and only for a live request.
    if (!p || p.status !== "locked" || p.unlock_requested_by !== user.id) return json({ error: "No pending request" }, 400);

    const { data: yr } = await admin.rpc("current_lodge_year");
    const { data: appts } = await admin.from("officer_appointments")
      .select("member_id,position_key").eq("lodge_year", yr).in("position_key", ["treasurer", "secretary"]);

    const byMember = new Map<string, string[]>();
    for (const a of appts ?? []) {
      const arr = byMember.get(a.member_id) ?? [];
      arr.push(a.position_key === "treasurer" ? "Treasurer" : "Secretary");
      byMember.set(a.member_id, arr);
    }
    const ids = [...byMember.keys(), user.id];
    const { data: profs } = await admin.from("profiles").select("id,email,full_name").in("id", ids);
    const requester = profs?.find((x: any) => x.id === user.id)?.full_name ?? "";

    let sent = 0;
    const failures: string[] = [];
    for (const [mid, offices] of byMember) {
      const email = profs?.find((x: any) => x.id === mid)?.email;
      if (!email) continue;
      const res = await sendTransactionalEmail({
        templateName: "period-unlock-requested",
        recipientEmail: email,
        idempotencyKey: `unlock-req-${p.id}-${p.unlock_requested_at}-${mid}`,
        templateData: {
          periodLabel: p.label,
          reason: p.unlock_reason ?? "",
          requestedBy: requester,
          approveAs: offices.sort().reverse().join(" & "),
          dashboardUrl: "https://weybridgelodge.org.uk/members/dashboard",
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
