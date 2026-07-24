// dues-notify-price-change — admin trigger. For a scheduled dues_settings row
// (effective_lodge_year > current), email every affected member with active
// monthly subscription, and stamp notice_sent_at.
//
// Body: { settings_id }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function gbp(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function effectiveDateFor(year: number): string {
  const d = new Date(Date.UTC(year, 9, 1));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing auth" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc("has_role" as any, { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const { settings_id } = await req.json().catch(() => ({}));
    if (!settings_id) return json({ error: "settings_id required" }, 400);

    const { data: setting } = await admin
      .from("dues_settings")
      .select("*")
      .eq("id", settings_id)
      .maybeSingle();
    if (!setting) return json({ error: "Setting not found" }, 404);

    const newAnnual = (setting as any).annual_amount_pence as number;
    const newYear = (setting as any).effective_lodge_year as number;

    // Previous applied setting to compute old annual
    const { data: prev } = await admin
      .from("dues_settings")
      .select("annual_amount_pence")
      .lt("effective_lodge_year", newYear)
      .order("effective_lodge_year", { ascending: false })
      .limit(1)
      .maybeSingle();
    const oldAnnual = (prev as any)?.annual_amount_pence ?? null;
    const effectiveDate = effectiveDateFor(newYear);

    // Find all active monthly subs
    const { data: subs } = await admin
      .from("dues_subscriptions")
      .select("id, member_id, method")
      .eq("plan", "monthly")
      .in("status", ["active", "past_due", "setup"]);

    const memberIds = (subs ?? []).map((s: any) => s.member_id);
    if (memberIds.length === 0) {
      await admin.from("dues_settings").update({ notice_sent_at: new Date().toISOString() }).eq("id", settings_id);
      return json({ ok: true, sent: 0, recipients: 0 });
    }

    const { data: profiles } = await admin
      .from("profiles")
      .select("id,email,first_name")
      .in("id", memberIds);

    const byMember = new Map<string, any>();
    for (const p of profiles ?? []) byMember.set((p as any).id, p);

    let sent = 0;
    const failures: { email: string; error: string }[] = [];
    for (const s of subs ?? []) {
      const p = byMember.get((s as any).member_id);
      if (!p?.email) continue;
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
          body: JSON.stringify({
            templateName: "dues-price-change-notice",
            recipientEmail: p.email,
            idempotencyKey: `dues-notice-${settings_id}-${(s as any).member_id}`,
            templateData: {
              firstName: p.first_name ?? null,
              oldAnnual: oldAnnual ? gbp(oldAnnual) : undefined,
              newAnnual: gbp(newAnnual),
              newMonthly: gbp(Math.round(newAnnual / 12)),
              effectiveDate,
              method: (s as any).method,
              noticeDays: 10,
            },
          }),
        });
        const r = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((r as any)?.error || `HTTP ${res.status}`);
        sent++;
      } catch (e) {
        failures.push({ email: p.email, error: (e as Error).message });
      }
    }

    await admin.from("dues_settings").update({ notice_sent_at: new Date().toISOString() }).eq("id", settings_id);
    return json({ ok: true, sent, recipients: subs?.length ?? 0, failures });
  } catch (e) {
    console.error("dues-notify-price-change error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
