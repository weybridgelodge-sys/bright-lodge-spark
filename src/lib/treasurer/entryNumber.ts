/** Journal entry document numbers (journal_entries.entry_number), assigned by the database. */
export function formatEntryNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "";
  return `JE-${String(Math.trunc(n)).padStart(6, "0")}`;
}

/** True when a search term matches a number, e.g. "123", "JE-123", "je-000123". */
export function entryNumberMatches(n: number | null | undefined, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  const formatted = formatEntryNumber(n).toLowerCase();
  if (!formatted) return false;
  if (formatted.includes(t)) return true;
  const digits = t.replace(/^je-?/, "").replace(/^0+/, "");
  return digits !== "" && /^\d+$/.test(digits) && String(n) === digits;
}

type GroupLine = { entryNumber: number; debit: number; code: string };

/** Keeps lines of one entry together: by entry number, debits before credits, then account code. */
export function compareWithinEntry(a: GroupLine, b: GroupLine): number {
  if (a.entryNumber !== b.entryNumber) return a.entryNumber - b.entryNumber;
  const ad = a.debit > 0 ? 0 : 1;
  const bd = b.debit > 0 ? 0 : 1;
  if (ad !== bd) return ad - bd;
  return a.code.localeCompare(b.code, undefined, { numeric: true });
}
