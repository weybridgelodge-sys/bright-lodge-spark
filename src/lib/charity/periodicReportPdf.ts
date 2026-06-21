import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoAsset from "@/assets/weybridge-logo-white.png.asset.json";
import { gbp, COLLECTION_TYPE_LABEL, type Collection, type Donation, type Charity, type FestivalSettings, reliefChestBalance, isFestivalDonation, PAYMENT_METHOD_LABEL } from "./queries";

const NAVY: [number, number, number] = [27, 42, 74];
const GOLD: [number, number, number] = [201, 164, 50];
const INK: [number, number, number] = [30, 30, 35];
const MUTED: [number, number, number] = [110, 110, 120];

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const inRange = (dateIso: string, start: string, end: string) => dateIso >= start && dateIso <= end;

export async function buildCharityPeriodicReportPdf(args: {
  title: string;
  startDate: string;
  endDate: string;
  collections: Collection[];
  donations: Donation[];
  charities: Charity[];
  festival: FestivalSettings | null;
  stewardNotes: string;
  finalised?: boolean;
}) {
  const { title, startDate, endDate, collections, donations, charities, festival, stewardNotes, finalised } = args;
  const charityById = new Map(charities.map((c) => [c.id, c]));

  const periodColl = collections.filter((c) => inRange(c.collection_date, startDate, endDate));
  const periodDon = donations.filter((d) => inRange(d.donation_date, startDate, endDate));

  const byType = (t: string) => periodColl.filter((c) => c.collection_type === t).reduce((a, c) => a + Number(c.net_amount), 0);
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
  const totalLodgeDonated = periodDon.reduce((a, d) => a + Number(d.amount), 0);
  const totalMatchFunded = periodDon.reduce((a, d) => a + Number(d.match_funding_amount ?? 0), 0);
  const totalDonated = totalLodgeDonated + totalMatchFunded;

  const donByCharity = new Map<string, number>();
  periodDon.forEach((d) => donByCharity.set(d.charity_id, (donByCharity.get(d.charity_id) ?? 0) + combined(d)));
  const charityRows = Array.from(donByCharity.entries())
    .map(([id, total]) => ({ name: charityById.get(id)?.name ?? "(unknown)", total }))
    .sort((a, b) => b.total - a.total);

  const largest = periodDon.reduce((max, d) => (combined(d) > (max ? combined(max) : 0) ? d : max), null as Donation | null);
  const festivalPeriod = periodDon.filter((d) => isFestivalDonation(d, charities, festival)).reduce((a, d) => a + combined(d), 0);
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
  doc.text(`Charity Steward's Periodic Report${finalised ? " (Finalised)" : ""}`, margin + 80, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(230, 230, 235);
  doc.text(`${title} · ${fmt(startDate)} – ${fmt(endDate)}`, margin + 80, 90);
  doc.text(`Generated: ${fmt(new Date().toISOString())}`, pageW - margin, 90, { align: "right" });

  let y = 130;
  const FOOTER_RESERVE = 60;
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - FOOTER_RESERVE) { doc.addPage(); y = margin; }
  };
  const section = (t: string, followingHeight = 80) => {
    ensureSpace(32 + followingHeight);
    doc.setFillColor(...NAVY);
    doc.rect(margin, y, pageW - margin * 2, 22, "F");
    doc.setTextColor(...GOLD);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(t, margin + 10, y + 15);
    y += 32;
  };
  const table = (head: string[][], body: any[][], colStyles?: Record<number, any>, keepTogether = true) => {
    autoTable(doc, {
      head, body, startY: y,
      margin: { left: margin, right: margin, bottom: FOOTER_RESERVE },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4, overflow: "linebreak" },
      headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 247, 238] },
      theme: "grid",
      columnStyles: colStyles ?? { 0: { cellWidth: 320 }, 1: { cellWidth: 195, halign: "right" } },
      rowPageBreak: "avoid",
      pageBreak: keepTogether ? "avoid" : "auto",
    });
    y = (doc as any).lastAutoTable.finalY + 16;
  };

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

  section("1. Collections in the Period");
  table(
    [["Type", "Amount"]],
    [
      [COLLECTION_TYPE_LABEL.charity_column, gbp(totals.charity_column)],
      [COLLECTION_TYPE_LABEL.raffle, gbp(totals.raffle)],
      [COLLECTION_TYPE_LABEL.ad_hoc, gbp(totals.ad_hoc)],
      [COLLECTION_TYPE_LABEL.relief_chest, gbp(totals.relief_chest)],
      [COLLECTION_TYPE_LABEL.other, gbp(totals.other)],
      ["Total collected", gbp(totalCollected)],
      ["Relief Chest balance (all-time)", gbp(reliefBalance)],
    ],
  );

  section("2. Donations in the Period");
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
      { 0: { cellWidth: 380 }, 1: { cellWidth: 135, halign: "right" } }, false);
  }

  if (periodDon.length) {
    section(`${charityRows.length ? "4" : "3"}. Donation Detail`);
    table(
      [["Date", "Charity", "Amount", "Match", "Method", "Purpose"]],
      periodDon
        .slice()
        .sort((a, b) => a.donation_date.localeCompare(b.donation_date))
        .map((d) => [
          fmt(d.donation_date),
          charityById.get(d.charity_id)?.name ?? "—",
          gbp(Number(d.amount)),
          Number(d.match_funding_amount ?? 0) > 0 ? gbp(Number(d.match_funding_amount)) : "—",
          PAYMENT_METHOD_LABEL[d.payment_method] ?? d.payment_method,
          d.purpose ?? "—",
        ]),
      {
        0: { cellWidth: 70 },
        1: { cellWidth: 110 },
        2: { cellWidth: 60, halign: "right" },
        3: { cellWidth: 60, halign: "right" },
        4: { cellWidth: 60 },
        5: { cellWidth: 155 },
      },
    );
  }

  section(`${charityRows.length ? (periodDon.length ? "5" : "4") : (periodDon.length ? "4" : "3")}. ${festival?.festival_name ?? "Festival"} Contribution`);
  table(
    [["Metric", "Value"]],
    [
      ["Contributed in period", gbp(festivalPeriod)],
      ["Cumulative total (all-time)", gbp(festivalCumulative)],
      ["Target", festival ? gbp(Number(festival.target_amount)) : "—"],
      ["% of target", festival && Number(festival.target_amount) > 0 ? `${Math.round((festivalCumulative / Number(festival.target_amount)) * 100)}%` : "—"],
    ],
  );

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
    doc.text("Confidential — Charity Steward's Periodic Report. For Charity Steward, WM, Treasurer, and Secretary.", margin, pageH - 16);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 16, { align: "right" });
  }
  return doc;
}
