import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { assetUrl } from "@/lib/assetUrl";
import coverLogoAsset from "@/assets/weybridge-logo-navy-transparent.png.asset.json";
import { GOLD, INK, MUTED, NAVY, acct, fmtDate, loadReportLogo, reportSection } from "./reports";
import { AUDITOR_LABEL, type Approval, type Round, type Signoff, type YearSnapshot } from "./yearAudit";
import autoTable from "jspdf-autotable";
import { certifiedPackPath, packComparative, selectPackSource, type CompLine, type PackSource } from "./accountsPack";

export type Certifier = { role: string; name: string; rank: string; date: string };

async function loadImageData(input: { url?: string }): Promise<string | null> {
  try {
    const res = await fetch(assetUrl(input));
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

function pageHeader(doc: jsPDF, pageW: number, margin: number, title: string, draft: boolean) {
  doc.setFillColor(...NAVY); doc.rect(0, 0, pageW, 60, "F");
  doc.setFillColor(...GOLD); doc.rect(0, 60, pageW, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("times", "bold"); doc.setFontSize(14);
  doc.text("Weybridge Lodge No. 6787", margin, 28);
  doc.setFont("times", "italic"); doc.setFontSize(11); doc.setTextColor(...GOLD);
  doc.text(title, margin, 46);
  if (draft) { doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("DRAFT — not yet approved", pageW - margin, 46, { align: "right" }); }
  return 90;
}

export async function buildAccountsPackPdf(src: PackSource, year: number, certifiers: Certifier[]): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight(), margin = 40;
  const endLabel = `30 September ${year + 1}`;
  const logo = await loadReportLogo();
  const coverLogo = await loadImageData(coverLogoAsset);

  // 1. Cover
  doc.setFillColor(250, 250, 247); doc.rect(0, 0, pageW, pageH, "F");
  doc.setFillColor(...NAVY); doc.rect(0, 0, pageW, 96, "F");
  doc.setFillColor(...GOLD); doc.rect(0, 96, pageW, 3, "F");
  doc.setDrawColor(...NAVY); doc.setLineWidth(1); doc.rect(margin, 132, pageW - margin * 2, 548);
  if (coverLogo) { try { doc.addImage(coverLogo, "PNG", pageW / 2 - 65, 172, 130, 130); } catch { /* ignore */ } }
  doc.setTextColor(...NAVY); doc.setFont("times", "bold"); doc.setFontSize(26);
  doc.text("Weybridge Lodge No. 6787", pageW / 2, 350, { align: "center" });
  doc.setFont("times", "italic"); doc.setFontSize(14); doc.setTextColor(...GOLD);
  doc.text("Province of Surrey", pageW / 2, 375, { align: "center" });
  doc.setFillColor(...GOLD); doc.rect(pageW / 2 - 90, 402, 180, 2, "F");
  doc.setFont("times", "bold"); doc.setFontSize(18); doc.setTextColor(...NAVY);
  doc.text("Annual Accounts", pageW / 2, 455, { align: "center" });
  doc.setFont("times", "normal"); doc.setFontSize(14);
  doc.text(`for the year ended ${endLabel}`, pageW / 2, 477, { align: "center" });
  if (src.draft) {
    doc.setDrawColor(...GOLD); doc.setLineWidth(1.5); doc.rect(pageW / 2 - 150, 520, 300, 40);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...NAVY);
    doc.text("DRAFT — not yet approved", pageW / 2, 545, { align: "center" });
  }
  doc.setFillColor(...GOLD); doc.rect(margin, pageH - 110, pageW - margin * 2, 2, "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text(src.draft ? `Live figures as generated ${fmtDate(new Date().toISOString())}` : `Certified figures · audit round ${src.round} · snapshot taken ${fmtDate(src.snap.taken_at.slice(0, 10))}`,
    pageW / 2, pageH - 85, { align: "center" });

  // 2. Treasurer's Remarks
  doc.addPage();
  let y = pageHeader(doc, pageW, margin, "Treasurer's Remarks", src.draft);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(...INK);
  const text = src.remarks?.trim() || "No remarks.";
  for (const line of doc.splitTextToSize(text, pageW - margin * 2) as string[]) {
    if (y > pageH - 60) { doc.addPage(); y = pageHeader(doc, pageW, margin, "Treasurer's Remarks (continued)", src.draft); doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(...INK); }
    doc.text(line, margin, y); y += 15;
  }

  const st = packComparative(src.snap);
  const bs = src.snap.balance_sheet, ie = src.snap.income_expenditure;
  const pbs = src.snap.comparative?.balance_sheet, pie = src.snap.comparative?.income_expenditure;
  const curH = `${year}/${String(year + 1).slice(2)} £`, priH = `${year - 1}/${String(year).slice(2)} £`;
  const head = [["Account", curH, st.hasPrior ? priH : ""]];
  const p = (v: number | null | undefined) => (st.hasPrior && v != null ? acct(v) : "");
  const rows = (ls: CompLine[]) => ls.map((l) => [`${l.code} — ${l.name}`, acct(l.cur), p(l.pri)]);
  const tot = (label: string, c: number, pr: number | null | undefined) => [label, acct(c), p(pr)];
  const table = (yy: number, body: string[][], boldFrom: number) => {
    autoTable(doc, {
      head, body, startY: yy,
      margin: { left: margin, right: margin, bottom: 60 },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4, overflow: "linebreak" },
      headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold", halign: "right" },
      alternateRowStyles: { fillColor: [250, 247, 238] },
      theme: "grid",
      columnStyles: { 0: { cellWidth: 275 }, 1: { cellWidth: 120, halign: "right" }, 2: { cellWidth: 120, halign: "right", textColor: MUTED } },
      rowPageBreak: "avoid",
      didParseCell: (d) => {
        if (d.section === "head" && d.column.index === 0) d.cell.styles.halign = "left";
        if (d.section === "body" && d.row.index >= boldFrom) d.cell.styles.fontStyle = "bold";
      },
    });
    return (doc as any).lastAutoTable.finalY + 16;
  };

  // 3. Balance Sheet
  doc.addPage();
  y = pageHeader(doc, pageW, margin, `Balance Sheet as at ${endLabel}`, src.draft);
  if (st.hasPrior) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
    doc.text(`Comparative figures: as at 30 September ${year}.`, margin, y - 8);
  }
  y = reportSection(doc, pageW, margin, y, "Assets");
  y = table(y, [...rows(st.assets), tot("Total assets", bs.assets, pbs?.assets)], st.assets.length);
  y = reportSection(doc, pageW, margin, y, "Liabilities");
  y = table(y, [...rows(st.liabilities), tot("Total liabilities", bs.liabilities, pbs?.liabilities), tot("Net assets", bs.net_assets, pbs?.net_assets)], st.liabilities.length);
  y = reportSection(doc, pageW, margin, y, "Funds");
  table(y, [
    tot("General Fund brought forward", bs.fund_bf, pbs?.fund_bf),
    tot("Surplus/(deficit) for the year", bs.surplus, pbs?.surplus),
    tot("Total funds", bs.total_funds, pbs?.total_funds),
  ], 2);

  // 4. Income & Expenditure
  doc.addPage();
  y = pageHeader(doc, pageW, margin, `Income & Expenditure for the year ended ${endLabel}`, src.draft);
  if (st.hasPrior) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
    doc.text(`Comparative figures: year ended 30 September ${year}.`, margin, y - 8);
  }
  y = reportSection(doc, pageW, margin, y, "Income");
  y = table(y, [...rows(st.income), tot("Total income", ie.income, pie?.income)], st.income.length);
  y = reportSection(doc, pageW, margin, y, "Expenditure");
  y = table(y, [...rows(st.expense), tot("Total expenditure", ie.expenditure, pie?.expenditure)], st.expense.length);
  table(y, [tot("Surplus/(deficit) for the year", ie.surplus, pie?.surplus)], 0);

  // 5. Certificate (approved only)
  if (!src.draft && certifiers.length) {
    doc.addPage();
    y = pageHeader(doc, pageW, margin, "Auditors' Certificate", false);
    doc.setFont("times", "normal"); doc.setFontSize(12); doc.setTextColor(...INK);
    const cert = `We have examined the accounts of Weybridge Lodge No. 6787 for the year ended ${endLabel}, comprising the Balance Sheet and the Income & Expenditure account set out in this document, and believe them to be accurate.`;
    for (const line of doc.splitTextToSize(cert, pageW - margin * 2) as string[]) { doc.text(line, margin, y); y += 17; }
    y += 30;
    for (const c of certifiers) {
      doc.setDrawColor(...GOLD); doc.setLineWidth(0.8); doc.line(margin, y, margin + 260, y);
      doc.setFont("times", "bold"); doc.setFontSize(12); doc.setTextColor(...INK);
      doc.text(`${c.name}${c.rank ? `, ${c.rank}` : ""}`, margin, y + 16);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...MUTED);
      doc.text(`${c.role} · confirmed electronically ${c.date}`, margin, y + 31);
      y += 80;
    }
  }

  const n = doc.getNumberOfPages();
  for (let i = 2; i <= n; i++) {
    doc.setPage(i); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text(`Annual Accounts ${year}/${year + 1}${src.draft ? " · DRAFT" : ""} · page ${i} of ${n}`, pageW / 2, pageH - 25, { align: "center" });
  }
  return doc;
}

async function resolveCertifiers(sigs: Signoff[]): Promise<Certifier[]> {
  if (!sigs.length) return [];
  const { data } = await supabase.from("profiles").select("id,full_name,provincial_rank,grand_rank,post_nominals").in("id", sigs.map((s) => s.signed_by));
  const by = new Map(((data as any[]) ?? []).map((p) => [p.id, p]));
  return sigs.map((s) => {
    const p: any = by.get(s.signed_by) ?? {};
    return { role: AUDITOR_LABEL[s.officer_role], name: p.full_name || "Unknown", rank: [p.post_nominals, p.provincial_rank, p.grand_rank].filter(Boolean).join(" "), date: fmtDate(s.signed_at.slice(0, 10)) };
  });
}

/** Loads approval/rounds/sign-offs (and live figures if not approved) and builds the pack. */
export async function generateAccountsPack(year: number): Promise<{ doc: jsPDF; src: PackSource; approval: any | null }> {
  const { data: ap } = await supabase.from("treasurer_year_approvals" as any).select("*").eq("masonic_year", year).maybeSingle();
  const approval = (ap as any) ?? null;
  let rounds: Round[] = [], sigs: Signoff[] = [], live: YearSnapshot | null = null;
  if (approval) {
    const [rd, sg] = await Promise.all([
      supabase.from("treasurer_year_approval_rounds" as any).select("*").eq("approval_id", approval.id),
      supabase.from("treasurer_year_signoffs" as any).select("*").eq("approval_id", approval.id),
    ]);
    rounds = ((rd.data as any[]) ?? []) as Round[]; sigs = ((sg.data as any[]) ?? []) as Signoff[];
  }
  if (approval?.status !== "approved") {
    const { data, error } = await supabase.rpc("year_live_snapshot" as any, { _year: year } as any);
    if (error) throw error;
    live = data as unknown as YearSnapshot;
  }
  const src = selectPackSource({ approval: approval as Approval | null, rounds, sigs, live });
  const doc = await buildAccountsPackPdf(src, year, await resolveCertifiers(src.certifiers));
  return { doc, src, approval };
}

/** Stores the certified pack once (never overwrites) and records its path. Returns the path. */
export async function storeCertifiedPack(year: number): Promise<string | null> {
  const { doc, src, approval } = await generateAccountsPack(year);
  if (src.draft || !approval || src.round == null) return null;
  if (approval.certified_pack_path) return approval.certified_pack_path;
  const path = certifiedPackPath(year, src.round);
  const { error } = await supabase.storage.from("lodge-docs").upload(path, doc.output("blob"), { contentType: "application/pdf", upsert: false });
  if (error && !/exists|duplicate/i.test(error.message)) throw error;
  const { error: e2 } = await supabase.rpc("record_certified_pack" as any, { _approval_id: approval.id, _path: path } as any);
  if (e2) throw e2;
  return path;
}
