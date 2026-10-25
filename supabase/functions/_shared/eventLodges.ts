// Lodge choices on a public event booking form (browser re-exports this file).
// Options = the event's "Hosting lodges" (one per line, as typed), else the
// owning lodge from Unit Setup, plus the fixed "Other" and "Guest" choices.
// The stored lodge_label is the option value (full lodge name, "Other" or "Guest").

export const OTHER_LODGE = "Other";
export const GUEST_LODGE = "Guest";
export type LodgeOption = { value: string; label: string };

export function eventLodgeOptions(hostingLodges: readonly unknown[] | null | undefined, owningLodge?: string | null): LodgeOption[] {
  const seen = new Set<string>();
  const hosts = (Array.isArray(hostingLodges) ? hostingLodges : [])
    .map((l) => String(l ?? "").trim())
    .filter((l) => l && l !== OTHER_LODGE && l !== GUEST_LODGE && !seen.has(l.toLowerCase()) && seen.add(l.toLowerCase()));
  const own = (owningLodge ?? "").trim();
  const named = hosts.length ? hosts : own ? [own] : [];
  return [
    ...named.map((l) => ({ value: l, label: l })),
    { value: OTHER_LODGE, label: "Another lodge" },
    { value: GUEST_LODGE, label: "Guest / not a Freemason" },
  ];
}

/** "X Lodge No. 123" -> "x" (used only to recognise short values sent by older pages). */
const baseName = (l: string) => l.toLowerCase().replace(/\s+no\.?\s*\d+\s*$/, "").replace(/\s+lodge$/, "").trim();

/**
 * The option a submitted value refers to, or null (reject). Exact option values
 * match (case-insensitive); a short lodge name ("X" for "X Lodge No. 123") is
 * accepted only when it names exactly one option, so pages loaded before this
 * change still book. The canonical option value is what gets stored.
 */
export function matchLodgeOption(value: unknown, options: LodgeOption[]): string | null {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!v) return null;
  const exact = options.find((o) => o.value.toLowerCase() === v);
  if (exact) return exact.value;
  const short = options.filter((o) => o.value !== OTHER_LODGE && o.value !== GUEST_LODGE && baseName(o.value) === v);
  return short.length === 1 ? short[0].value : null;
}
