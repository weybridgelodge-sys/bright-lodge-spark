// Daily scheduled job: balance reminders 14 and 3 days before the balance due date, and the
// optional "decide later" course-choice reminder. Each kind is sent once per booking: a row in
// event_booking_reminders is claimed first (unique booking+kind) and released if the send fails.
// Overdue balances are only flagged for the Treasurer (derived on screen); seats are never released.
// Auth: service-role bearer only (the schedule passes it from the vault). ?dry_run=1 lists without sending.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { balanceReminderDue, choicesReminderDue } from "../_shared/eventPricing.ts";
import { londonToday, sendEventBookingEmails, serviceClient } from "../_shared/stripe-events.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!expected || auth !== `Bearer ${expected}`) return json({ error: "Unauthorized" }, 401);
  const dryRun = new URL(req.url).searchParams.get("dry_run") === "1";
  const sb = serviceClient();
  const today = londonToday();

  const { data: events } = await sb.from("event_accounts").select("id,event_date,balance_due_date,modules,event_type").is("archived_at", null).gte("event_date", today);
  const evById = new Map((events ?? []).map((e: any) => [e.id, e]));
  if (!evById.size) return json({ ok: true, planned: [] });
  const { data: bookings } = await sb.from("event_bookings")
    .select("id,event_id,payment_status,payment_plan,balance_due_pence,balance_due_date,contact_email")
    .in("event_id", [...evById.keys()]).in("payment_status", ["deposit_paid", "paid"]).not("contact_email", "is", null);
  const ids = (bookings ?? []).map((b: any) => b.id);
  if (!ids.length) return json({ ok: true, planned: [] });
  const [{ data: sentRows }, { data: undecided }] = await Promise.all([
    sb.from("event_booking_reminders").select("booking_id,kind").in("booking_id", ids),
    sb.from("event_guest_course_choices").select("booking_id").in("booking_id", ids).eq("decide_later", true),
  ]);
  const sentBy = new Map<string, Set<string>>();
  for (const r of sentRows ?? []) (sentBy.get(r.booking_id) ?? sentBy.set(r.booking_id, new Set()).get(r.booking_id)!).add(r.kind);
  const hasUndecided = new Set((undecided ?? []).map((r: any) => r.booking_id));

  const planned: { booking_id: string; kind: string }[] = [];
  for (const b of bookings ?? []) {
    const ev: any = evById.get(b.event_id);
    const sent = sentBy.get(b.id) ?? new Set<string>();
    if (b.payment_status === "deposit_paid" && b.balance_due_pence > 0 && b.balance_due_date) {
      const k = balanceReminderDue(b.balance_due_date, today, sent);
      if (k) planned.push({ booking_id: b.id, kind: k });
    }
    const decideLater = ev?.event_type !== "simple" && ev?.modules?.courses_decide_later === true;
    if (decideLater && hasUndecided.has(b.id) && choicesReminderDue(b.balance_due_date || ev.balance_due_date || ev.event_date, today, sent)) {
      planned.push({ booking_id: b.id, kind: "choices" });
    }
  }
  if (dryRun) return json({ ok: true, dry_run: true, today, planned });

  let sent = 0, failed = 0;
  for (const r of planned) {
    const { error: claimErr } = await sb.from("event_booking_reminders").insert({ booking_id: r.booking_id, kind: r.kind });
    if (claimErr) continue; // already claimed by an earlier/parallel run
    const res = await sendEventBookingEmails(sb, r.booking_id, r.kind === "choices" ? "choices" : "reminder", { reminderKind: r.kind });
    if (res.ok) sent++;
    else { failed++; await sb.from("event_booking_reminders").delete().eq("booking_id", r.booking_id).eq("kind", r.kind); }
  }
  console.log("event-balance-reminders", { today, planned: planned.length, sent, failed });
  return json({ ok: true, today, planned: planned.length, sent, failed });
});
