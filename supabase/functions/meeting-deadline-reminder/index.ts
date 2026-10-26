// meeting-deadline-reminder — daily cron. Finds published REGULAR meetings
// whose booking deadline (meeting_date - 7 days) falls on today, and notifies
// active members who have not yet booked/RSVP'd for that meeting, via BOTH
// email and push. Once per member per meeting (regular_meeting_reminders_sent).
//
// Manual/dry-run:
//   ?force=1            bypass the 07:00 Europe/London wall-clock guard
//   ?dry_run=1          compute + return the exact copy and recipients, send nothing
//   ?meeting_id=<uuid>  target one specific meeting regardless of its deadline date
//   ?test_email=a@b.c   send the real email to this address only (no push, no marking)
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendTransactionalEmail } from "../_shared/send-email.ts";
import { loadLodgeSettingsStrict } from "../_shared/lodgeSettings.ts";
import { forEachUnit, listActiveUnits } from "../_shared/units.ts";
import { runUnit, targetMeetingDate } from "./run.ts";

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

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const dryRun = url.searchParams.get("dry_run") === "1";
  const meetingId = url.searchParams.get("meeting_id");
  const testEmail = url.searchParams.get("test_email")?.trim() || null;

  const londonHour = parseInt(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false })
      .format(new Date()),
    10,
  );
  if (!force && !dryRun && londonHour !== 7) {
    return json({ ok: true, skipped: true, londonHour });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const push = async (body: Record<string, unknown>) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify(body),
    });
    return await res.json().catch(() => ({}));
  };

  try {
    const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
    const targetStr = targetMeetingDate(todayStr);
    const units = await listActiveUnits(admin);
    // Each lodge runs on its own; one failing never stops the others.
    const outcomes = await forEachUnit(units, async (unitId) => {
      const lodge = await loadLodgeSettingsStrict(unitId);
      return runUnit({ db: admin, send: sendTransactionalEmail as any, push }, unitId, lodge, { dryRun, meetingId, testEmail, targetStr });
    }, "meeting-deadline-reminder");
    return json({ ok: true, dry_run: dryRun, target_meeting_date: targetStr, units: outcomes });
  } catch (e) {
    console.error("meeting-deadline-reminder error", e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
