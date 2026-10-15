/** Pure helpers for duplicating a public event into next year's draft. */

export const PUBLIC_SITE_ORIGIN = "https://weybridgelodge.org.uk";

/** Bump 4-digit years (2026 -> 2027) and 2-digit year suffixes after letters (XMAS26 -> XMAS27). */
export function bumpYear(s: string): { text: string; changed: boolean } {
  let changed = false;
  let text = s.replace(/\b(19|20)(\d{2})\b/g, (m) => { changed = true; return String(Number(m) + 1); });
  if (!changed) {
    text = s.replace(/([A-Za-z])(\d{2})$/, (_m, l: string, y: string) => { changed = true; return `${l}${String((Number(y) + 1) % 100).padStart(2, "0")}`; });
  }
  return { text, changed };
}

export function addOneYear(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  // 29 Feb rolls to 28 Feb.
  const day = m === 2 && d === 29 ? 28 : d;
  return `${y + 1}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function uniqueSlug(base: string, existing: Iterable<string | null | undefined>): string {
  const taken = new Set([...existing].filter(Boolean) as string[]);
  const clean = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 76) || "event";
  if (!taken.has(clean)) return clean;
  for (let i = 2; ; i++) if (!taken.has(`${clean}-${i}`)) return `${clean}-${i}`;
}

const COPY_FIELDS = [
  "tagline", "intro_copy", "useful_stuff", "dress_code", "menu_items", "dietary_choices", "highlights",
  "adult_price_pence", "child_price_pence", "theme", "hosting_lodges", "venue", "capacity",
  "start_time", "end_time", "statement_descriptor", "events_notify_email", "short_link",
  "event_type", "modules", "payment_mode", "deposit_percent", "fee_cover_enabled",
  "seo_title", "seo_description", "og_image_url",
] as const;

/** Builds the insert payload for a new draft; never copies bookings, money, archive or publish state. */
export function buildDuplicatePayload(row: Record<string, any>, existingSlugs: Iterable<string | null | undefined>) {
  const out: Record<string, any> = {};
  for (const k of COPY_FIELDS) if (k in row) out[k] = row[k];
  // A short link points at the old page, so it is not carried over.
  out.short_link = null;
  const title = bumpYear(row.public_title ?? row.name ?? "");
  const name = bumpYear(row.name ?? "");
  out.public_title = row.public_title ? (title.changed ? title.text : `${title.text} (copy)`) : null;
  out.name = name.changed ? name.text : `${name.text || "Event"} (copy)`;
  const slugBase = row.slug ? bumpYear(row.slug) : { text: out.public_title ?? out.name, changed: true };
  out.slug = uniqueSlug(slugBase.changed ? slugBase.text : `${slugBase.text}-copy`, existingSlugs);
  out.reference_prefix = row.reference_prefix ? bumpYear(row.reference_prefix).text : null;
  out.event_date = addOneYear(row.event_date);
  if ("balance_due_date" in row) out.balance_due_date = row.balance_due_date ? addOneYear(row.balance_due_date) : null;
  if (row.seo_title) out.seo_title = bumpYear(row.seo_title).text;
  out.booking_deadline = null;
  out.is_public = false;
  out.archived_at = null;
  out.status = "planning";
  return out;
}

/** The QR encodes the short link when set, otherwise the canonical public page. */
export function eventQrTarget(row: { slug: string | null; short_link?: string | null }): string | null {
  const s = row.short_link?.trim();
  if (s) return s;
  return row.slug ? `${PUBLIC_SITE_ORIGIN}/events/${row.slug}` : null;
}

export const isValidShortLink = (s: string) => s.trim() === "" || /^https:\/\/[^\s/]+\.[^\s]+$/i.test(s.trim());
