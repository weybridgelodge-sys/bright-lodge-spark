// festive-board-deadline-reminder — daily cron. Finds meetings whose linked
// lodge_event booking_deadline falls within the next 2 days and pushes a
// reminder to active members who have not booked. Duplicate suppression via
// festive_board_deadline_reminders_sent (unique on meeting_id, member_id).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Same DST-aware wall-clock guard as almoner-overdue-check: fire once per
  // day at 07:00 Europe/London. `?force=1` bypasses for manual triggers.
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const londonHour = parseInt(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false })
      .format(new Date()),
    10,
  );
  if (!force && londonHour !== 7) {
    return new Response(JSON.stringify({ ok: true, skipped: true, londonHour }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const in2 = new Date(today.getTime() + 2 * 86400_000).toISOString().slice(0, 10);

    // Find lodge_events with booking_deadline within [today, today+2]
    const { data: events, error: evErr } = await admin
      .from("lodge_events")
      .select("slug, event_date, booking_deadline")
      .eq("published", true)
      .not("booking_deadline", "is", null)
      .gte("booking_deadline", todayStr)
      .lte("booking_deadline", in2);
    if (evErr) throw evErr;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ ok: true, meetings: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slugs = events.map((e: any) => e.slug);
    const { data: meetings } = await admin
      .from("festive_board_meetings")
      .select("id, meeting_date, event_key, status")
      .in("event_key", slugs)
      .eq("status", "published");

    const results: unknown[] = [];

    for (const m of (meetings ?? []) as any[]) {
      const evt = events.find((e: any) => e.slug === m.event_key);
      if (!evt) continue;

      const [{ data: actives }, { data: booked }, { data: alreadySent }] = await Promise.all([
        admin.from("profiles").select("id").eq("status", "active"),
        admin.from("festive_board_attendance").select("member_id").eq("meeting_id", m.id).not("member_id", "is", null),
        admin.from("festive_board_deadline_reminders_sent").select("member_id").eq("meeting_id", m.id),
      ]);

      const bookedSet = new Set((booked ?? []).map((r: any) => r.member_id));
      const sentSet = new Set((alreadySent ?? []).map((r: any) => r.member_id));
      const targets = (actives ?? [])
        .map((r: any) => r.id as string)
        .filter((id) => !bookedSet.has(id) && !sentSet.has(id));

      if (targets.length === 0) {
        results.push({ meeting_id: m.id, targets: 0 });
        continue;
      }

      const meetingDate = new Date(m.meeting_date).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      });
      const deadlineDate = new Date(evt.booking_deadline).toLocaleDateString("en-GB", {
        day: "numeric", month: "short",
      });

      let pushResult: unknown = null;
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
          body: JSON.stringify({
            member_ids: targets,
            title: "Booking deadline approaching",
            body: `Festive Board ${meetingDate} — please book by ${deadlineDate}.`,
            data: { type: "festive_board_deadline", meeting_id: m.id },
          }),
        });
        pushResult = await res.json().catch(() => ({}));
      } catch (e) {
        console.error("push send failed", (e as Error).message);
      }

      // Mark as sent (idempotent via PK)
      const rows = targets.map((mid) => ({ meeting_id: m.id, member_id: mid }));
      const { error: insErr } = await admin
        .from("festive_board_deadline_reminders_sent")
        .upsert(rows, { onConflict: "meeting_id,member_id", ignoreDuplicates: true });
      if (insErr) console.error("mark-sent failed", insErr.message);

      results.push({ meeting_id: m.id, targets: targets.length, pushResult });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("festive-board-deadline-reminder error", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
