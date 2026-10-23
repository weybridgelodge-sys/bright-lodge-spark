// Summons front cover on the shared brand look (@react-pdf twin of src/lib/pdfBrand's header).
// Crest = Unit Setup crest_image through the same createPdfRun processCrest path (12s timeout,
// downscale, flatten on white); any failure omits the image and the booklet still builds.
// Identity = Unit Setup (loadDocIdentity) first, template fields only where Unit Setup is blank.
import React from "react";
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { loadPdfBrand, type PdfBrandDeps, type CrestImage } from "@/lib/pdfBrand";
import type { DocIdentity } from "@/lib/docIdentity";

const NAVY = "#1B2A4A";
const GOLD = "#C9A432"; // rules only
const MUTED = "#5A6070";
export const SUMMONS_COVER_CREST_PT = 125;

/** "Surrey" or "Province of Surrey" -> "PROVINCE OF SURREY"; "Provincial Grand Lodge of …" kept as typed; never doubled. */
export function coverProvinceLine(province: string): string {
  const p = (province || "").trim();
  if (!p) return "";
  if (/^provincial grand lodge\b/i.test(p)) return p;
  return `PROVINCE OF ${p.replace(/^province\s+of\s+/i, "").toUpperCase()}`;
}

export type SummonsCoverBrand = { identity: DocIdentity | null; crest: CrestImage | null };

/** Never throws: identity or crest failures give nulls. */
export async function loadSummonsCoverBrand(deps: PdfBrandDeps = {}): Promise<SummonsCoverBrand> {
  try {
    return await loadPdfBrand(deps);
  } catch {
    return { identity: null, crest: null };
  }
}

/** The summons template's own name/number/province fields, used only where Unit Setup is blank. */
export type CoverFallback = { name?: string | null; number?: string | null; province?: string | null };

/** Unit Setup wins where it has a value; template field otherwise; blank stays blank. */
export function summonsCoverIdentity(brand: SummonsCoverBrand, t: CoverFallback) {
  const pick = (a?: string | null, b?: string | null) => (a || "").trim() || (b || "").trim();
  return {
    name: pick(brand.identity?.lodgeName, t.name),
    number: pick(brand.identity?.lodgeNumber, t.number),
    province: pick(brand.identity?.provinceName, t.province),
  };
}

/** Shrinks the serif name for long lodge names so it stays on at most two lines in an A5 panel. */
export function coverNameSize(title: string): number {
  const n = title.length;
  if (n <= 26) return 22;
  if (n <= 34) return 19;
  if (n <= 44) return 16;
  return 14;
}

const st = StyleSheet.create({
  name: { fontFamily: "Times-Bold", lineHeight: 1.15, color: NAVY, textAlign: "center", marginBottom: 3 },
  sub: { fontFamily: "Times-Roman", fontSize: 11, color: MUTED, textAlign: "center", letterSpacing: 1, marginTop: 1 },
  rule: { borderBottom: `1pt solid ${GOLD}`, marginVertical: 8 },
  crest: { width: SUMMONS_COVER_CREST_PT, height: SUMMONS_COVER_CREST_PT, objectFit: "contain" },
});

export const SummonsCoverHeader: React.FC<{
  brand: SummonsCoverBrand;
  fallback: CoverFallback;
  leftSrc?: string | null;
  rightSrc?: string | null;
}> = ({ brand, fallback, leftSrc, rightSrc }) => {
  const id = summonsCoverIdentity(brand, fallback);
  const title = [id.name, id.number ? `No. ${id.number}` : ""].filter(Boolean).join(" ");
  return (
    <View>
      {title ? <Text style={[st.name, { fontSize: coverNameSize(title) }]}>{title}</Text> : null}
      {id.province ? <Text style={st.sub}>{coverProvinceLine(id.province)}</Text> : null}
      <View style={st.rule} />
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, marginBottom: 4 }}>
        <View style={{ flex: 1, alignItems: "flex-start" }}>
          {leftSrc ? <Image src={leftSrc} style={{ height: 75 }} /> : null}
        </View>
        <View style={{ flex: 1, alignItems: "center" }}>
          {brand.crest ? <Image src={brand.crest.dataUrl} style={st.crest} /> : null}
        </View>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          {rightSrc ? <Image src={rightSrc} style={{ height: 75 }} /> : null}
        </View>
      </View>
    </View>
  );
};
