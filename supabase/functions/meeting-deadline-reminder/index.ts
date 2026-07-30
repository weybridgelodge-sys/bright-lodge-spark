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

// "12th September"
function ordinalDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  const suffix = day % 10 === 1 && day !== 11
    ? "st"
    : day % 10 === 2 && day !== 12
    ? "nd"
    : day % 10 === 3 && day !== 13
    ? "rd"
    : "th";
  const month = d.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  return `${day}${suffix} ${month}`;
}

const TITLE = "Booking Deadline For Weybridge Meeting Approaching";
const bodyCopy = (meetingDate: string, deadlineDate: string) =>
  `The deadline for our next meeting on ${meetingDate} is approaching. Please book your space by ${deadlineDate}.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const dryRun = url.searchParams.get("dry_run") === "1";
  const meetingIdParam = url.searchParams.get("meeting_id");
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

  try {
    // Today in Europe/London (YYYY-MM-DD)
    const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
    // Deadline is meeting_date - 7 days, so today's targets meet on today + 7.
    const targetMeetingDate = new Date(`${todayStr}T00:00:00Z`);
    targetMeetingDate.setUTCDate(targetMeetingDate.getUTCDate() + 7);
    const targetStr = targetMeetingDate.toISOString().slice(0, 10);

    let q = admin
      .from("festive_board_meetings")
      .select("id, meeting_date, meeting_type, status")
      .eq("meeting_type", "regular")
      .eq("status", "published");
    q = meetingIdParam ? q.eq("id", meetingIdParam) : q.eq("meeting_date", targetStr);

    const { data: meetings, error: mErr } = await q;
    if (mErr) throw mErr;

    if (!meetings || meetings.length === 0) {
      return json({ ok: true, dry_run: dryRun, target_meeting_date: targetStr, meetings: 0 });
    }

    const results: unknown[] = [];

    for (const m of meetings as any[]) {
      const deadline = new Date(`${m.meeting_date}T00:00:00Z`);
      deadline.setUTCDate(deadline.getUTCDate() - 7);
      const meetingDate = ordinalDate(m.meeting_date);
      const deadlineDate = ordinalDate(deadline.toISOString().slice(0, 10));
      const message = bodyCopy(meetingDate, deadlineDate);

      const [{ data: actives }, { data: booked }, { data: alreadySent }] = await Promise.all([
        admin.from("profiles").select("id, email, is_test_account").eq("status", "active"),
        admin
          .from("festive_board_attendance")
          .select("member_id")
          .eq("meeting_id", m.id)
          .not("member_id", "is", null),
        admin.from("regular_meeting_reminders_sent").select("member_id").eq("meeting_id", m.id),
      ]);

      const bookedSet = new Set((booked ?? []).map((r: any) => r.member_id));
      const sentSet = new Set((alreadySent ?? []).map((r: any) => r.member_id));
      const targets = (actives ?? [])
        .filter((p: any) => !p.is_test_account)
        .filter((p: any) => !bookedSet.has(p.id) && !sentSet.has(p.id));

      if (dryRun) {
        results.push({
          meeting_id: m.id,
          meeting_date: m.meeting_date,
          deadline_date: deadline.toISOString().slice(0, 10),
          subject: TITLE,
          push_title: TITLE,
          body: message,
          would_notify: targets.length,
          recipients: targets.map((p: any) => p.email).filter(Boolean),
        });
        continue;
      }

      // --- Email ---------------------------------------------------------
      const emailRecipients = testEmail
        ? [{ id: null as string | null, email: testEmail }]
        : targets.filter((p: any) => !!p.email).map((p: any) => ({ id: p.id, email: p.email }));

      let sent = 0;
      const failures: { email: string; error: string }[] = [];
      for (const r of emailRecipients) {
        const idempotencyKey = testEmail
          ? `meeting-deadline-${m.id}-test-${crypto.randomUUID()}`
          : `meeting-deadline-${m.id}-${r.email}`;
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
            body: JSON.stringify({
              templateName: "meeting-deadline-reminder",
              recipientEmail: r.email,
              idempotencyKey,
              templateData: {
                meetingDate,
                deadlineDate,
                bookingUrl: "https://weybridgelodge.org.uk/bookings",
              },
            }),
          });
          const out = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error((out as any)?.error || `HTTP ${res.status}`);
          sent++;
        } catch (e) {
          failures.push({ email: r.email, error: (e as Error).message });
        }
      }

      // --- Push (never blocks the email flow) -----------------------------
      let pushResult: unknown = null;
      if (!testEmail && targets.length > 0) {
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
            body: JSON.stringify({
              member_ids: targets.map((p: any) => p.id),
              title: TITLE,
              body: message,
              data: { type: "meeting_deadline", meeting_id: m.id },
            }),
          });
          pushResult = await res.json().catch(() => ({}));
        } catch (e) {
          console.error("push send failed", (e as Error).message);
        }
      }

      // --- Mark as sent ---------------------------------------------------
      if (!testEmail && targets.length > 0) {
        const rows = targets.map((p: any) => ({ meeting_id: m.id, member_id: p.id }));
        const { error: insErr } = await admin
          .from("regular_meeting_reminders_sent")
          .upsert(rows, { onConflict: "meeting_id,member_id", ignoreDuplicates: true });
        if (insErr) console.error("mark-sent failed", insErr.message);
      }

      results.push({
        meeting_id: m.id,
        meeting_date: m.meeting_date,
        subject: TITLE,
        body: message,
        targets: targets.length,
        emails_sent: sent,
        email_failures: failures,
        pushResult,
        test_email: testEmail ?? undefined,
      });
    }

    return json({ ok: true, dry_run: dryRun, target_meeting_date: targetStr, results });
  } catch (e) {
    console.error("meeting-deadline-reminder error", e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
