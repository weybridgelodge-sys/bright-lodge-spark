import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { assetUrl } from "@/lib/assetUrl";
import logoAsset from "@/assets/weybridge-logo-white.png.asset.json";
import { supabase } from "@/integrations/supabase/client";


export const NAVY: [number, number, number] = [27, 42, 74];
export const GOLD: [number, number, number] = [201, 164, 50];
export const INK: [number, number, number] = [30, 30, 35];
export const MUTED: [number, number, number] = [110, 110, 120];

export type Account = { id: string; code: string; name: string; account_type: string };

export const money = (pence: number) =>
  `£${(Math.abs(pence) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Accounts-style presentation: negatives in brackets. */
export const acct = (pence: number) => (pence < 0 ? `(${money(pence)})` : money(pence));

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export const shiftBackOneYear = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
};

/**
 * Treasurer financial year: fixed calendar dates, 1 October – 30 September.
 * `year` is the year in which the period STARTS (e.g. 2025 → 1 Oct 2025 – 30 Sep 2026).
 */
export function treasurerYearBounds(year: number): { start: string; end: string; label: string } {
  return { start: `${year}-10-01`, end: `${year + 1}-09-30`, label: `${year}/${year + 1}` };
}

/** The treasurer financial year (starting year) whose bounds contain the given ISO date. */
export function treasurerYearContaining(iso: string): number {
  const y = Number(iso.slice(0, 4));
  return iso >= `${y}-10-01` ? y : y - 1;
}

export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("chart_of_accounts" as any)
    .select("id,code,name,account_type")
    .order("code");
  if (error) throw error;
  return ((data as any[]) ?? []) as Account[];
}

type Movement = { debit: number; credit: number };

/**
 * Sums journal lines by account for entries whose entry_date falls in [from, to].
 * Pass from = null for "from inception".
 */
export async function fetchMovements(from: string | null, to: string): Promise<Map<string, Movement>> {
  const data: any[] = [];
  // Page through in 1000-row chunks so large ledgers are never truncated by the API row cap.
  for (let offset = 0; ; offset += 1000) {
    let q = supabase
      .from("journal_lines" as any)
      .select("id,account_id,debit_pence,credit_pence,journal_entries!inner(entry_date)")
      .lte("journal_entries.entry_date", to);
    if (from) q = q.gte("journal_entries.entry_date", from);
    const { data: page, error } = await q.order("id").range(offset, offset + 999);
    if (error) throw error;
    data.push(...((page as any[]) ?? []));
    if (!page || page.length < 1000) break;
  }
  const map = new Map<string, Movement>();
  for (const row of data) {
    const cur = map.get(row.account_id) ?? { debit: 0, credit: 0 };
    cur.debit += Number(row.debit_pence ?? 0);
    cur.credit += Number(row.credit_pence ?? 0);
    map.set(row.account_id, cur);
  }
  return map;
}

/** Income = credits − debits; Expense = debits − credits; Asset = debits − credits; Liability/Equity = credits − debits. */
export function signedBalance(accountType: string, m: Movement | undefined): number {
  if (!m) return 0;
  return accountType === "expense" || accountType === "asset"
    ? m.debit - m.credit
    : m.credit - m.debit;
}

export async function reportPdfDoc(subtitle: string, periodLine: string, hideGeneratedDate = false) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  let logoData: string | null = null;
  try {
    const res = await fetch(assetUrl(logoAsset));
    const blob = await res.blob();
    logoData = await new Promise<string>((r) => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result as string);
      fr.readAsDataURL(blob);
    });
  } catch { /* ignore */ }

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 110, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 110, pageW, 3, "F");
  if (logoData) { try { doc.addImage(logoData, "PNG", margin, 22, 66, 66); } catch { /* ignore */ } }
  doc.setTextColor(255, 255, 255);
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text("Weybridge Lodge No. 6787", margin + 80, 50);
  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.setTextColor(...GOLD);
  doc.text(subtitle, margin + 80, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(230, 230, 235);
  doc.text(periodLine, margin + 80, 90);
  if (!hideGeneratedDate) {
    doc.text(`Generated: ${fmtDate(new Date().toISOString())}`, pageW - margin, 90, { align: "right" });
  }

  return { doc, pageW, margin };
}

export function reportSection(doc: jsPDF, pageW: number, margin: number, y: number, title: string) {
  doc.setFillColor(...NAVY);
  doc.rect(margin, y, pageW - margin * 2, 22, "F");
  doc.setTextColor(...GOLD);
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text(title, margin + 10, y + 15);
  return y + 32;
}

export function reportTable(doc: jsPDF, margin: number, y: number, head: string[][], body: any[][]) {
  autoTable(doc, {
    head, body, startY: y,
    margin: { left: margin, right: margin, bottom: 60 },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4, overflow: "linebreak" },
    headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 247, 238] },
    theme: "grid",
    columnStyles: { 0: { cellWidth: 275 }, 1: { cellWidth: 120, halign: "right" }, 2: { cellWidth: 120, halign: "right" } },
    rowPageBreak: "avoid",
  });
  return (doc as any).lastAutoTable.finalY + 16;
}

/** Month keys (YYYY-MM, newest first, incl. future periods) from treasurer_periods, plus ledger date extremes. */
export async function fetchReportCalendar(): Promise<{ months: { ym: string; label: string }[]; dates: string[] }> {
  const [p, lo, hi] = await Promise.all([
    supabase.from("treasurer_periods" as any).select("label,period_start"),
    supabase.from("journal_entries" as any).select("entry_date").order("entry_date", { ascending: true }).limit(1),
    supabase.from("journal_entries" as any).select("entry_date").order("entry_date", { ascending: false }).limit(1),
  ]);
  const seen = new Map<string, string>();
  for (const r of ((p.data as any[]) ?? [])) {
    if (!r.period_start) continue;
    const ym = String(r.period_start).slice(0, 7);
    if (!seen.has(ym)) seen.set(ym, r.label);
  }
  const months = [...seen.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([ym, label]) => ({ ym, label }));
  const dates = [
    ...months.map((m) => `${m.ym}-01`),
    ((lo.data as any[]) ?? [])[0]?.entry_date,
    ((hi.data as any[]) ?? [])[0]?.entry_date,
  ].filter(Boolean) as string[];
  return { months, dates };
}

/** Every journal line up to `to` (account, date, amounts), paged past the 1000-row API cap. */
export async function fetchLedgerLines(to: string): Promise<{ account_id: string; entry_date: string; debit: number; credit: number }[]> {
  const out: { account_id: string; entry_date: string; debit: number; credit: number }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("journal_lines" as any)
      .select("id,account_id,debit_pence,credit_pence,journal_entries!inner(entry_date)")
      .lte("journal_entries.entry_date", to)
      .order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    for (const r of ((data as any[]) ?? [])) {
      out.push({ account_id: r.account_id, entry_date: r.journal_entries.entry_date, debit: Number(r.debit_pence ?? 0), credit: Number(r.credit_pence ?? 0) });
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}
