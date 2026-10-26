// One unit's waitlist-promoted notifications (JOB CI). Pure: db and email injected.
// Only bookings whose own unit_id is this unit are processed.
import type { LodgeSettings } from "../_shared/lodgeSettingsResolve.ts";
import { brandFields } from "../_shared/units.ts";
import { bookingFirstName } from "../_shared/greeting.ts";

// deno-lint-ignore no-explicit-any
type Db = any;
export interface Deps { db: Db; send: (p: Record<string, unknown>) => Promise<{ ok: boolean; status: number; error?: unknown }>; nowIso?: () => string }

export async function runUnit(deps: Deps, unitId: string, lodge: LodgeSettings, targetId: string | null) {
  const { db } = deps;
  let q = db.from("bookings")
    .select("id, contact_name, contact_email, event_label, event_key, meeting_id, details")
    .eq("promoted_from_waitlist", true).eq("payment_status", "confirmed").is("promotion_notified_at", null)
    .eq("unit_id", unitId).limit(50);
  if (targetId) q = q.eq("id", targetId);
  const { data: rows, error } = await q;
  if (error) throw error;
  const bookings = (rows ?? []) as any[];
  let sent = 0;
  for (const b of bookings) {
    let eventDate = "";
    try {
      if (b.meeting_id) {
        const { data: m } = await db.from("festive_board_meetings").select("meeting_date").eq("id", b.meeting_id).maybeSingle();
        if (m?.meeting_date) {
          eventDate = new Date(m.meeting_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
        }
      }
    } catch { /* ignore */ }
    const firstName = bookingFirstName(b.details, b.contact_name) || undefined;
    try {
      const res = await deps.send({
        templateName: "waitlist-promoted", recipientEmail: b.contact_email, idempotencyKey: `waitlist-promoted-${b.id}`, unitId,
        templateData: { firstName, eventLabel: b.event_label, eventDate, bookingRef: b.id.slice(0, 8), ...brandFields(lodge) },
      });
      if (res.error) { console.error("promoted email failed", b.id); continue; }
      await db.from("bookings").update({ promotion_notified_at: (deps.nowIso ?? (() => new Date().toISOString()))() }).eq("id", b.id);
      sent++;
    } catch {
      console.error("promoted email exception", b.id);
    }
  }
  return { processed: bookings.length, sent };
}
