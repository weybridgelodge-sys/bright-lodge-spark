/** Pure helpers for Dinner & Festival event modules (admin config). */

export type EventType = "simple" | "dinner_festival";
export type PaymentMode = "full" | "full_or_deposit";

export type EventModules = {
  courses: boolean;
  kids_menu: boolean;
  catalogue: boolean;
  deposit: boolean;
  info_blocks: boolean;
  sections: { menu: boolean; drinks: boolean; info: boolean; hosting_lodges: boolean; highlights: boolean };
};

export const MODULE_KEYS = ["courses", "kids_menu", "catalogue", "deposit", "info_blocks"] as const;
export const SECTION_KEYS = ["menu", "drinks", "info", "hosting_lodges", "highlights"] as const;

/** "One third" preset as stored (column is 3 dp); pricing treats it as exactly 100/3. */
export const ONE_THIRD_STORED = 33.333;

/** Exact percent to feed the shared pricing module: the stored preset means exactly one third. */
export function effectiveDepositPercent(stored: number): number {
  return Math.abs(stored - ONE_THIRD_STORED) < 1e-9 ? 100 / 3 : stored;
}

/** Anything unknown or missing is off; simple events always resolve to all modules off. */
export function parseModules(raw: unknown, eventType: EventType = "dinner_festival"): EventModules {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, any>) : {};
  const s = o.sections && typeof o.sections === "object" ? o.sections : {};
  const on = (v: unknown) => eventType !== "simple" && v === true;
  // Sections default to visible so turning a module on shows it.
  const sec = (v: unknown) => v !== false;
  return {
    courses: on(o.courses),
    kids_menu: on(o.courses) && on(o.kids_menu),
    catalogue: on(o.catalogue),
    deposit: on(o.deposit),
    info_blocks: on(o.info_blocks),
    sections: { menu: sec(s.menu), drinks: sec(s.drinks), info: sec(s.info), hosting_lodges: sec(s.hosting_lodges), highlights: sec(s.highlights) },
  };
}

/** Pounds text → pence; null for blank or invalid. */
export function poundsToPence(s: string): number | null {
  const t = s.trim().replace(/^£/, "");
  if (t === "" || !/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
}

export const penceToPounds = (p: number | null | undefined) => (p == null ? "" : (p / 100).toFixed(2));

/** Storage path for an info-block image: always inside the event's own folder. */
export function contentImagePath(eventId: string, fileName: string, rand: string = crypto.randomUUID()): string {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) throw new Error("Images must be JPEG, PNG or WebP");
  return `${eventId}/${rand}.${ext}`;
}

/** Path for a duplicated image in the new event's folder (keeps the file name). */
export function remapImagePath(path: string, newEventId: string): string {
  const file = path.split("/").pop() ?? path;
  return `${newEventId}/${file}`;
}

/** Validation mirrored from the database trigger, so admins see a friendly message first. */
export function paymentScheduleErrors(p: { payment_mode: PaymentMode; deposit_percent: number | null; balance_due_date: string | null; event_date: string }): string[] {
  if (p.payment_mode !== "full_or_deposit") return [];
  const out: string[] = [];
  if (p.deposit_percent == null || !(p.deposit_percent > 0 && p.deposit_percent < 100)) out.push("Deposit percent must be between 0 and 100");
  if (!p.balance_due_date) out.push("Balance due date is required");
  else if (p.balance_due_date > p.event_date) out.push("Balance due date must be on or before the event date");
  return out;
}
