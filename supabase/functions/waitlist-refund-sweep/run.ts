// One unit's waitlist refund sweep (JOB CI). Pure: db, Stripe refund and email injected.
// A booking's own unit_id wins; blank = skipped_no_unit (never refunded under a guessed lodge).
import type { LodgeSettings } from "../_shared/lodgeSettingsResolve.ts";
import { brandFields, recordUnit } from "../_shared/units.ts";
import { bookingFirstName } from "../_shared/greeting.ts";

// deno-lint-ignore no-explicit-any
type Db = any;
export interface Deps {
  db: Db;
  send: (p: Record<string, unknown>) => Promise<{ ok: boolean; status: number; error?: unknown }>;
  refund: (environment: string, paymentIntentId: string) => Promise<{ id: string }>;
  nowIso?: () => string;
}
export interface Opts { manualMeetingId: string | null; today: string }

export async function runUnit(deps: Deps, unitId: string, lodge: LodgeSettings, o: Opts) {
  const { db } = deps;
  const nowIso = deps.nowIso ?? (() => new Date().toISOString());
  let q = db.from("festive_board_meetings").select("id, meeting_date, status, event_key, unit_id").eq("unit_id", unitId);
  // Past meetings: meeting_date strictly before today (today's meeting is not swept), or completed.
  q = o.manualMeetingId ? q.eq("id", o.manualMeetingId) : q.or(`status.eq.completed,meeting_date.lt.${o.today}`);
  const { data: meetings, error } = await q;
  if (error) throw error;
  const meetingIds = (meetings ?? []).map((m: any) => m.id);
  if (meetingIds.length === 0) return { refunded: 0, failures: [] as unknown[] };

  const { data: waitlisted } = await db.from("bookings")
    .select("id, contact_name, contact_email, event_label, meeting_id, details, total_pence, stripe_payment_intent_id, environment, waitlist_refunded_at, unit_id")
    .in("meeting_id", meetingIds).eq("payment_status", "waitlisted");

  let refunded = 0, skippedNoUnit = 0, skippedOtherUnit = 0;
  const failures: { id: string; error: string }[] = [];
  for (const b of (waitlisted ?? []) as any[]) {
    const bu = recordUnit(b.unit_id);
    if (!bu) { skippedNoUnit++; continue; }
    if (bu !== unitId) { skippedOtherUnit++; continue; }
    if (b.waitlist_refunded_at) continue;
    if (!b.stripe_payment_intent_id) {
      await db.from("bookings").update({ payment_status: "waitlisted_refunded", waitlist_refunded_at: nowIso() }).eq("id", b.id);
      continue;
    }
    try {
      const refund = await deps.refund(b.environment, b.stripe_payment_intent_id);
      await db.from("bookings").update({ payment_status: "waitlisted_refunded", waitlist_refunded_at: nowIso(), stripe_refund_id: refund.id }).eq("id", b.id);
      const firstName = bookingFirstName(b.details, b.contact_name) || undefined;
      const totalAmount = b.total_pence ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(b.total_pence / 100) : undefined;
      const meetingRow = (meetings ?? []).find((m: any) => m.id === b.meeting_id);
      const eventDate = meetingRow?.meeting_date
        ? new Date(meetingRow.meeting_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" })
        : "";
      await deps.send({
        templateName: "waitlist-refunded", recipientEmail: b.contact_email, idempotencyKey: `waitlist-refund-${b.id}`, unitId,
        templateData: { firstName, eventLabel: b.event_label, eventDate, totalAmount, bookingRef: b.id.slice(0, 8), ...brandFields(lodge) },
      });
      refunded++;
    } catch (e) {
      console.error("refund failed", b.id);
      failures.push({ id: b.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { refunded, failures, ...(skippedNoUnit && { skipped_no_unit: skippedNoUnit }), ...(skippedOtherUnit && { skipped_other_unit: skippedOtherUnit }) };
}
