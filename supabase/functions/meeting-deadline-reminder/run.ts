// One unit's run of the meeting deadline reminder (JOB CI). Pure: db, email
// and push are injected so vitest can run it against fixtures.
import { deadlineReminderTitle, type LodgeSettings } from "../_shared/lodgeSettingsResolve.ts";
import { brandFields } from "../_shared/units.ts";

// deno-lint-ignore no-explicit-any
type Db = any;
export interface Deps {
  db: Db;
  send: (p: Record<string, unknown>) => Promise<{ ok: boolean; status: number; error?: unknown }>;
  push: (body: Record<string, unknown>) => Promise<unknown>;
  uuid?: () => string;
}
export interface Opts { dryRun: boolean; meetingId: string | null; testEmail: string | null; targetStr: string }

// "12th September"
export function ordinalDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  const month = d.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  return `${day}${suffix} ${month}`;
}

export const bodyCopy = (meetingDate: string, deadlineDate: string) =>
  `The deadline for our next meeting on ${meetingDate} is approaching. Please book your space by ${deadlineDate}.`;

/** Meeting date the reminder fires for: today (London) + 10 days. */
export function targetMeetingDate(todayStr: string): string {
  const t = new Date(`${todayStr}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 10);
  return t.toISOString().slice(0, 10);
}

export async function runUnit(deps: Deps, unitId: string, lodge: LodgeSettings, o: Opts) {
  const { db } = deps;
  const TITLE = deadlineReminderTitle(lodge.lodgeName);
  let q = db.from("festive_board_meetings")
    .select("id, meeting_date, meeting_type, status, event_key, unit_id")
    .eq("meeting_type", "regular").eq("status", "published").eq("unit_id", unitId);
  q = o.meetingId ? q.eq("id", o.meetingId) : q.eq("meeting_date", o.targetStr);
  const { data: rawMeetings, error: mErr } = await q;
  if (mErr) throw mErr;

  const { data: archivedRows } = await db.from("lodge_events").select("slug").not("archived_at", "is", null);
  const archivedKeys = new Set((archivedRows ?? []).map((r: any) => r.slug));
  const meetings = (rawMeetings ?? []).filter((m: any) => !m.event_key || !archivedKeys.has(m.event_key));
  if (meetings.length === 0) return { meetings: 0, results: [] as unknown[] };

  const bookingUrl = lodge.configuredSiteUrl ? `${lodge.configuredSiteUrl}/bookings` : "";
  const results: unknown[] = [];
  for (const m of meetings as any[]) {
    const deadline = new Date(`${m.meeting_date}T00:00:00Z`);
    deadline.setUTCDate(deadline.getUTCDate() - 7);
    const meetingDate = ordinalDate(m.meeting_date);
    const deadlineDate = ordinalDate(deadline.toISOString().slice(0, 10));
    const message = bodyCopy(meetingDate, deadlineDate);

    const [{ data: actives }, { data: booked }, { data: alreadySent }] = await Promise.all([
      db.from("profiles").select("id, email, is_test_account").eq("status", "active").eq("unit_id", unitId),
      db.from("festive_board_attendance").select("member_id").eq("meeting_id", m.id).not("member_id", "is", null),
      db.from("regular_meeting_reminders_sent").select("member_id").eq("meeting_id", m.id),
    ]);
    const bookedSet = new Set((booked ?? []).map((r: any) => r.member_id));
    const sentSet = new Set((alreadySent ?? []).map((r: any) => r.member_id));
    const targets = (actives ?? []).filter((p: any) => !p.is_test_account).filter((p: any) => !bookedSet.has(p.id) && !sentSet.has(p.id));

    if (o.dryRun) {
      results.push({
        meeting_id: m.id, meeting_date: m.meeting_date, deadline_date: deadline.toISOString().slice(0, 10),
        subject: TITLE, push_title: TITLE, body: message, would_notify: targets.length,
        recipients: targets.map((p: any) => p.email).filter(Boolean),
      });
      continue;
    }

    const emailRecipients = o.testEmail
      ? [{ id: null as string | null, email: o.testEmail }]
      : targets.filter((p: any) => !!p.email).map((p: any) => ({ id: p.id, email: p.email }));
    let sent = 0;
    const failures: { email: string; error: string }[] = [];
    for (const r of emailRecipients) {
      // Meeting ids are unit-owned, so these keys can never collide across lodges.
      const idempotencyKey = o.testEmail
        ? `meeting-deadline-${m.id}-test-${(deps.uuid ?? (() => crypto.randomUUID()))()}`
        : `meeting-deadline-${m.id}-${r.email}`;
      try {
        const res = await deps.send({
          templateName: "meeting-deadline-reminder", recipientEmail: r.email, idempotencyKey, unitId,
          templateData: { meetingDate, deadlineDate, bookingUrl, ...brandFields(lodge) },
        });
        if (!res.ok) throw new Error(String((res.error as any) ?? `HTTP ${res.status}`));
        sent++;
      } catch (e) {
        failures.push({ email: r.email, error: (e as Error).message });
      }
    }

    let pushResult: unknown = null;
    if (!o.testEmail && targets.length > 0) {
      try {
        pushResult = await deps.push({ member_ids: targets.map((p: any) => p.id), title: TITLE, body: message, data: { type: "meeting_deadline", meeting_id: m.id } });
      } catch (e) {
        console.error("push send failed", (e as Error).message);
      }
    }

    if (!o.testEmail && targets.length > 0) {
      const rows = targets.map((p: any) => ({ meeting_id: m.id, member_id: p.id }));
      const { error: insErr } = await db.from("regular_meeting_reminders_sent").upsert(rows, { onConflict: "meeting_id,member_id", ignoreDuplicates: true });
      if (insErr) console.error("mark-sent failed", insErr.message);
    }

    results.push({ meeting_id: m.id, meeting_date: m.meeting_date, subject: TITLE, body: message, targets: targets.length, emails_sent: sent, email_failures: failures, pushResult, test_email: o.testEmail ?? undefined });
  }
  return { meetings: meetings.length, results };
}
