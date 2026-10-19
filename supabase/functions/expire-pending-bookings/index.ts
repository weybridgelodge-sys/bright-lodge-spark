// Hourly: clear unpaid card bookings once their 60-minute hold and the
// 15-minute grace have passed. Stripe is asked first; a paid session is
// marked paid (same path as payments-webhook) instead of being deleted.
// Quiet: no emails about expired bookings. Runs per unit and per Stripe
// environment. ?dry_run=1 reports decisions without changing anything.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { processPendingBooking } from "../_shared/processPendingBooking.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // Secured like almoner-overdue-check / secretary reminders: the hourly
  // schedule sends the service-role key from the vault; every other caller
  // (including dry runs) is refused.
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!expected || token !== expected) return json({ error: "Unauthorized" }, 401);
  const dryRun = new URL(req.url).searchParams.get("dry_run") === "1";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, expected);
  const now = new Date();

  const { data: rows, error } = await supabase
    .from("bookings")
    .select("id, unit_id, environment, created_at, stripe_session_id")
    .eq("payment_status", "pending")
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) return json({ error: error.message }, 500);

  // Group per unit, then per environment, so each unit's live and test
  // bookings are handled with that environment's Stripe credentials.
  const groups = new Map<string, typeof rows>();
  for (const r of rows ?? []) {
    const key = `${(r as any).unit_id ?? "unknown"}|${(r as any).environment}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const report: Record<string, unknown>[] = [];
  for (const [key, list] of groups) {
    const [unit, envRaw] = key.split("|");
    if (envRaw !== "live" && envRaw !== "sandbox") {
      for (const b of list!) report.push({ id: String(b.id).slice(0, 8), unit, action: "keep", reason: "unknown environment" });
      continue;
    }
    const env = envRaw as StripeEnv;
    let stripe: ReturnType<typeof createStripeClient> | null = null;
    try { stripe = createStripeClient(env); } catch (e) { console.error("Stripe unavailable for", env, e); }

    for (const b of list!) {
      report.push({ unit, ...(await processPendingBooking(supabase, stripe, b as any, env, now, dryRun)) });
    }
  }
  console.log("expire-pending-bookings", JSON.stringify({ dryRun, checked: report.length }));
  return json({ dry_run: dryRun, now: now.toISOString(), bookings: report });
});
