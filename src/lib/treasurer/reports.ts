import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { assetUrl } from "@/lib/assetUrl";
import logoAsset from "@/assets/weybridge-logo-white.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { masonicYearBounds } from "@/lib/charity/queries";

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

/** The masonic year whose bounds contain the given ISO date. */
export function masonicYearContaining(iso: string): number {
  const y = Number(iso.slice(0, 4));
  for (const candidate of [y, y - 1]) {
    const b = masonicYearBounds(candidate);
    if (iso >= b.start && iso <= b.end) return candidate;
  }
  return y;
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
  let q = supabase
    .from("journal_lines" as any)
    .select("account_id,debit_pence,credit_pence,journal_entries!inner(entry_date)")
    .lte("journal_entries.entry_date", to);
  if (from) q = q.gte("journal_entries.entry_date", from);
  const { data, error } = await q;
  if (error) throw error;
  const map = new Map<string, Movement>();
  for (const row of ((data as any[]) ?? [])) {
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

export async function reportPdfDoc(subtitle: string, periodLine: string) {
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
  doc.text(`Generated: ${fmtDate(new Date().toISOString())}`, pageW - margin, 90, { align: "right" });

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
