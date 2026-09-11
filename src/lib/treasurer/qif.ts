/**
 * QIF (Quicken Interchange Format) parser — isolated on purpose.
 *
 * Built against the documented public QIF standard:
 *   !Type:Bank        optional type header
 *   D  date
 *   T  amount (signed; positive = money in, negative = money out)
 *   U  amount (duplicate of T in some exports — used only if T missing)
 *   P  payee
 *   M  memo
 *   N  cheque/reference number
 *   ^  end-of-transaction delimiter
 *
 * Real Lloyds exports have not been seen yet — when one arrives, adjust this
 * file only. Nothing in the UI depends on QIF specifics.
 */

export type QifDateOrder = "auto" | "dmy" | "mdy";

export type QifTransaction = {
  /** ISO yyyy-mm-dd, or null when the date line was missing/unparseable. */
  date: string | null;
  /** Signed amount in pence: positive = paid in, negative = paid out. */
  amountPence: number;
  /** Payee (P), falling back to memo when no payee line was present. */
  description: string;
  /** Memo (M) when it adds something beyond the payee. */
  memo: string | null;
  /** Original file order, 0-based. */
  order: number;
  /** Raw date string as it appeared in the file. */
  rawDate: string | null;
};

export type QifParseResult = {
  ok: boolean;
  transactions: QifTransaction[];
  /** Date order actually used. */
  dateOrder: "dmy" | "mdy";
  /** True when auto-detection could not prove the order (all day values <= 12). */
  dateOrderAmbiguous: boolean;
  totalInPence: number;
  totalOutPence: number;
  netPence: number;
  warnings: string[];
  error?: string;
};

const clean = (s: string) => s.replace(/\r/g, "").trim();

function parseAmount(raw: string): number | null {
  // Strip currency symbols, spaces and thousands separators. Handle
  // trailing/leading minus and parenthesised negatives.
  let s = clean(raw).replace(/[£$€\s]/g, "").replace(/,/g, "");
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  if (s.startsWith("-")) { negative = true; s = s.slice(1); }
  else if (s.endsWith("-")) { negative = true; s = s.slice(0, -1); }
  if (s.startsWith("+")) s = s.slice(1);
  if (!/^\d*(\.\d*)?$/.test(s) || s === "" || s === ".") return null;
  const pence = Math.round(parseFloat(s) * 100);
  if (!Number.isFinite(pence)) return null;
  return negative ? -pence : pence;
}

/** Split a QIF date into its three numeric parts. Handles 12/31'25 and 12/31/2025. */
function dateParts(raw: string): [number, number, number] | null {
  const s = clean(raw).replace(/'/g, "/");
  const m = s.match(/^(\d{1,4})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  let c = parseInt(m[3], 10);
  if (c < 100) c += c < 70 ? 2000 : 1900;
  if ([a, b, c].some((n) => Number.isNaN(n))) return null;
  return [a, b, c];
}

function toIso(day: number, month: number, year: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

/** Very small sample-based detector: any first-field value > 12 proves DD/MM. */
export function detectDateOrder(rawDates: string[]): { order: "dmy" | "mdy"; ambiguous: boolean } {
  let firstOver12 = false;
  let secondOver12 = false;
  for (const raw of rawDates) {
    const p = dateParts(raw);
    if (!p) continue;
    if (p[0] > 12) firstOver12 = true;
    if (p[1] > 12) secondOver12 = true;
  }
  if (firstOver12 && !secondOver12) return { order: "dmy", ambiguous: false };
  if (secondOver12 && !firstOver12) return { order: "mdy", ambiguous: false };
  // Nothing proves it either way (or the file contradicts itself).
  // UK bank exports are overwhelmingly DD/MM — default to that, but flag it.
  return { order: "dmy", ambiguous: true };
}

export function parseQif(text: string, dateOrder: QifDateOrder = "auto"): QifParseResult {
  const warnings: string[] = [];
  const empty = (error: string): QifParseResult => ({
    ok: false, transactions: [], dateOrder: "dmy", dateOrderAmbiguous: false,
    totalInPence: 0, totalOutPence: 0, netPence: 0, warnings, error,
  });

  if (!text || !clean(text)) return empty("The file is empty.");

  // Collect raw records first, ignoring any header lines (!Type:Bank, !Account…).
  type Raw = { D?: string; T?: string; U?: string; P?: string; M?: string; N?: string };
  const records: Raw[] = [];
  let current: Raw = {};
  let touched = false;

  for (const line of text.split(/\n/)) {
    const l = clean(line);
    if (!l) continue;
    if (l.startsWith("!")) continue; // type/account headers — irrelevant to us
    if (l.startsWith("^")) {
      if (touched) records.push(current);
      current = {};
      touched = false;
      continue;
    }
    const code = l[0].toUpperCase();
    const value = clean(l.slice(1));
    if (code === "D" || code === "T" || code === "U" || code === "P" || code === "M" || code === "N") {
      // Later duplicates of a field within one record win only if empty so far.
      if (!current[code as keyof Raw]) current[code as keyof Raw] = value;
      touched = true;
    }
  }
  if (touched) records.push(current); // file with no trailing ^

  const usable = records.filter((r) => r.T !== undefined || r.U !== undefined);
  if (usable.length === 0) {
    return empty("No QIF transactions found — no amount (T) lines were present.");
  }
  if (records.length !== usable.length) {
    warnings.push(`${records.length - usable.length} record(s) skipped: no amount line.`);
  }

  const detected = dateOrder === "auto"
    ? detectDateOrder(usable.map((r) => r.D ?? ""))
    : { order: dateOrder, ambiguous: false };
  if (detected.ambiguous) {
    warnings.push("Date order could not be proven from this file (no day value above 12). Read as DD/MM — check a couple of rows against the statement.");
  }

  const transactions: QifTransaction[] = [];
  usable.forEach((r, i) => {
    const amount = parseAmount(r.T ?? r.U ?? "");
    if (amount === null) {
      warnings.push(`Row ${i + 1}: amount "${r.T ?? r.U}" could not be read — skipped.`);
      return;
    }
    let iso: string | null = null;
    if (r.D) {
      const p = dateParts(r.D);
      if (p) {
        const [a, b, y] = p;
        iso = detected.order === "dmy" ? toIso(a, b, y) : toIso(b, a, y);
        if (!iso) iso = toIso(b, a, y) ?? toIso(a, b, y); // last-ditch swap
      }
      if (!iso) warnings.push(`Row ${i + 1}: date "${r.D}" could not be read.`);
    } else {
      warnings.push(`Row ${i + 1}: no date line.`);
    }

    const payee = r.P ?? "";
    const memo = r.M ?? "";
    const ref = r.N ? ` (ref ${r.N})` : "";
    const description = (payee || memo || "(no description)") + ref;

    transactions.push({
      date: iso,
      amountPence: amount,
      description,
      memo: memo && memo !== payee ? memo : null,
      order: transactions.length,
      rawDate: r.D ?? null,
    });
  });

  if (transactions.length === 0) return empty("No readable transactions found in this file.");

  const totalInPence = transactions.filter((t) => t.amountPence > 0).reduce((s, t) => s + t.amountPence, 0);
  const totalOutPence = transactions.filter((t) => t.amountPence < 0).reduce((s, t) => s - t.amountPence, 0);

  return {
    ok: true,
    transactions,
    dateOrder: detected.order,
    dateOrderAmbiguous: detected.ambiguous,
    totalInPence,
    totalOutPence,
    netPence: totalInPence - totalOutPence,
    warnings,
  };
}
