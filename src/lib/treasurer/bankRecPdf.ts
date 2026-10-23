// Bank Reconciliation PDF (Treasurer). Figures and wording are prepared by BankReconciliationTab;
// this file only lays them out on the shared report header (reportPdfDoc) with fixed column widths.
import { reportPdfDoc, reportSectionTable, type ReportPdfDeps } from "./reports";

/** Explicit widths (A4 portrait, 515pt content). Amount columns are right-aligned and fit "(£12,345.67)". */
export const BANK_REC_COLUMNS = {
  statement: { 0: { cellWidth: 275 }, 1: { cellWidth: 120 }, 2: { cellWidth: 120, halign: "right" } },
  unpresented: { 0: { cellWidth: 66 }, 1: { cellWidth: 66 }, 2: { cellWidth: "auto" }, 3: { cellWidth: 90, halign: "right" } },
  remaining: { 0: { cellWidth: 66 }, 1: { cellWidth: "auto" }, 2: { cellWidth: 90, halign: "right" } },
} as const;

export type BankRecPdfInput = {
  periodLine: string;
  statementLabel: string;
  statementRows: string[][];
  unpresentedRows: string[][]; // empty = section omitted
  remainingRows: string[][]; // empty = section omitted
};

export async function buildBankRecPdf(input: BankRecPdfInput, deps: ReportPdfDeps = {}) {
  const { doc, pageW, margin, startY, finish } = await reportPdfDoc("Bank Reconciliation", input.periodLine, false, deps);
  let y = startY;
  y = reportSectionTable(doc, pageW, margin, y, `Statement — ${input.statementLabel}`,
    [["", "", "Amount"]], input.statementRows, BANK_REC_COLUMNS.statement as any);
  if (input.unpresentedRows.length) {
    y = reportSectionTable(doc, pageW, margin, y, "Unpresented ledger items",
      [["Doc no.", "Date", "Description", "Amount"]], input.unpresentedRows, BANK_REC_COLUMNS.unpresented as any);
  }
  if (input.remainingRows.length) {
    reportSectionTable(doc, pageW, margin, y, "Bank lines still unreconciled",
      [["Date", "Description", "Amount"]], input.remainingRows, BANK_REC_COLUMNS.remaining as any);
  }
  finish();
  return doc;
}
