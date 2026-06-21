import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoAsset from "@/assets/weybridge-logo-white.png.asset.json";
import { gbp, COLLECTION_TYPE_LABEL, type Collection, type Donation, type Charity, type FestivalSettings, masonicYearBounds, inYear, reliefChestBalance, isFestivalDonation } from "./queries";

const NAVY: [number, number, number] = [27, 42, 74];
const GOLD: [number, number, number] = [201, 164, 50];
const INK: [number, number, number] = [30, 30, 35];
const MUTED: [number, number, number] = [110, 110, 120];

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export async function buildCharityAnnualReportPdf(args: {
  year: number;
  collections: Collection[];
  donations: Donation[];
  charities: Charity[];
  festival: FestivalSettings | null;
  stewardNotes: string;
}) {
  const { year, collections, donations, charities, festival, stewardNotes } = args;
  const bounds = masonicYearBounds(year);
  const charityById = new Map(charities.map((c) => [c.id, c]));

  const yearColl = collections.filter((c) => inYear(c.collection_date, year));
  const yearDon = donations.filter((d) => inYear(d.donation_date, year));

  const byType = (t: string) => yearColl.filter((c) => c.collection_type === t).reduce((a, c) => a + Number(c.net_amount), 0);
  const totals = {
    charity_column: byType("charity_column"),
    raffle: byType("raffle"),
    ad_hoc: byType("ad_hoc"),
    relief_chest: byType("relief_chest"),
    other: byType("other"),
  };
  const totalCollected = Object.values(totals).reduce((a, b) => a + b, 0);
  const reliefBalance = reliefChestBalance(collections, donations);
  const combined = (d: Donation) => Number(d.amount) + Number(d.match_funding_amount ?? 0);
  const totalLodgeDonated = yearDon.reduce((a, d) => a + Number(d.amount), 0);
  const totalMatchFunded = yearDon.reduce((a, d) => a + Number(d.match_funding_amount ?? 0), 0);
  const totalDonated = totalLodgeDonated + totalMatchFunded;

  const donByCharity = new Map<string, number>();
  yearDon.forEach((d) => donByCharity.set(d.charity_id, (donByCharity.get(d.charity_id) ?? 0) + combined(d)));
  const charityRows = Array.from(donByCharity.entries())
    .map(([id, total]) => ({ name: charityById.get(id)?.name ?? "(unknown)", total }))
    .sort((a, b) => b.total - a.total);

  const largest = yearDon.reduce((max, d) => (combined(d) > (max ? combined(max) : 0) ? d : max), null as Donation | null);
  const festivalYear = yearDon.filter((d) => isFestivalDonation(d, charities, festival)).reduce((a, d) => a + combined(d), 0);
  const festivalCumulative = donations.filter((d) => isFestivalDonation(d, charities, festival)).reduce((a, d) => a + combined(d), 0);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  let logoData: string | null = null;
  try {
    const res = await fetch(logoAsset.url);
    const blob = await res.blob();
    logoData = await new Promise<string>((r) => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result as string);
      fr.readAsDataURL(blob);
    });
  } catch { /* ignore */ }

  // Header
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
  doc.text("Annual Charity Steward's Report", margin + 80, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(230, 230, 235);
  doc.text(`Masonic year ${bounds.label} · ${fmt(bounds.start)} – ${fmt(bounds.end)}`, margin + 80, 90);
  doc.text(`Generated: ${fmt(new Date().toISOString())}`, pageW - margin, 90, { align: "right" });

  let y = 130;

  const section = (title: string) => {
    if (y > pageH - 100) { doc.addPage(); y = margin; }
    doc.setFillColor(...NAVY);
    doc.rect(margin, y, pageW - margin * 2, 22, "F");
    doc.setTextColor(...GOLD);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(title, margin + 10, y + 15);
    y += 32;
  };
  const table = (head: string[][], body: any[][], colStyles?: Record<number, any>) => {
    autoTable(doc, {
      head, body, startY: y,
      margin: { left: margin, right: margin },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4, overflow: "linebreak" },
      headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 247, 238] },
      theme: "grid",
      columnStyles: colStyles ?? { 0: { cellWidth: 320 }, 1: { cellWidth: 195, halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
  };

  // Report summary (notes shown first)
  if (stewardNotes?.trim()) {
    section("Report Summary");
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(stewardNotes.trim(), pageW - margin * 2);
    if (y + lines.length * 12 > pageH - 60) { doc.addPage(); y = margin; }
    doc.text(lines, margin, y);
    y += lines.length * 12 + 16;
  }

  section("1. Collections in the Year");
  table(
    [["Type", "Amount"]],
    [
      [COLLECTION_TYPE_LABEL.charity_column, gbp(totals.charity_column)],
      [COLLECTION_TYPE_LABEL.raffle, gbp(totals.raffle)],
      [COLLECTION_TYPE_LABEL.ad_hoc, gbp(totals.ad_hoc)],
      [COLLECTION_TYPE_LABEL.relief_chest, gbp(totals.relief_chest)],
      [COLLECTION_TYPE_LABEL.other, gbp(totals.other)],
      ["Total collected", gbp(totalCollected)],
      ["Relief Chest balance at year end", gbp(reliefBalance)],
    ],
  );

  section("2. Donations in the Year");
  table(
    [["Metric", "Value"]],
    [
      ["Lodge donations", gbp(totalLodgeDonated)],
      ["Match funding received", gbp(totalMatchFunded)],
      ["Total donated (incl. match)", gbp(totalDonated)],
      ["Number of charities supported", String(charityRows.length)],
      ["Largest single donation", largest ? `${gbp(combined(largest))} — ${charityById.get(largest.charity_id)?.name ?? ""}` : "—"],
    ],
  );

  if (charityRows.length) {
    section("3. Breakdown by Recipient Charity");
    table([["Charity", "Total"]], charityRows.map((r) => [r.name, gbp(r.total)]),
      { 0: { cellWidth: 380 }, 1: { cellWidth: 135, halign: "right" } });
  }

  section(`${charityRows.length ? "4" : "3"}. ${festival?.festival_name ?? "Festival"} Contribution`);
  table(
    [["Metric", "Value"]],
    [
      ["Contributed in year", gbp(festivalYear)],
      ["Cumulative total", gbp(festivalCumulative)],
      ["Target", festival ? gbp(Number(festival.target_amount)) : "—"],
      ["% of target", festival && Number(festival.target_amount) > 0 ? `${Math.round((festivalCumulative / Number(festival.target_amount)) * 100)}%` : "—"],
    ],
  );




  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(margin, pageH - 40, pageW - margin, pageH - 40);
    doc.setTextColor(...NAVY);
    doc.setFont("times", "bold");
    doc.setFontSize(8);
    doc.text("Weybridge Lodge No. 6787", pageW / 2, pageH - 28, { align: "center" });
    doc.setFont("times", "italic");
    doc.setTextColor(...MUTED);
    doc.text("Confidential — Annual Charity Steward's Report. For Charity Steward, WM, Treasurer, and Secretary.", margin, pageH - 16);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 16, { align: "right" });
  }
  return doc;
}
