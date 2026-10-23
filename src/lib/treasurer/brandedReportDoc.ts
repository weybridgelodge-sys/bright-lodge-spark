// Batch C pilot: Treasurer report PDF on the shared white brand header (src/lib/pdfBrand).
// Other Treasurer reports, minutes and agenda use reportPdfDoc (reports.ts) on the same header.
import jsPDF from "jspdf";
import { loadDocIdentity } from "@/lib/docIdentity";
import { createPdfRun, drawBrandFooter, drawBrandHeader, fetchCrestUrl } from "@/lib/pdfBrand";
import { fmtDate } from "./reports";

export async function brandedReportPdfDoc(title: string, periodLine: string, hideGeneratedDate = false) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const run = createPdfRun();
  const [identity, crestUrl] = await Promise.all([loadDocIdentity(), fetchCrestUrl()]);
  const crest = await run.crest(crestUrl);
  const startY = drawBrandHeader(doc, {
    identity, crest, title, periodLine, margin,
    rightLine: hideGeneratedDate ? undefined : `Generated: ${fmtDate(new Date().toISOString())}`,
  });
  return { doc, pageW, margin, startY, finish: () => drawBrandFooter(doc, identity, margin) };
}
