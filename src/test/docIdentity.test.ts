import { describe, it, expect } from "vitest";
import fs from "fs";
import { docTitle, docSubtitle, docFileName, docGroupName, BLANK_DOC_IDENTITY } from "@/lib/docIdentity";
import { generateICS, icsFilename } from "@/lib/generateICS";
import { parseUnitProfile } from "@/lib/unitProfile";
import { resolveLodgeSettings } from "../../supabase/functions/_shared/lodgeSettingsResolve";

// Synthetic lodge, deliberately not the host lodge.
const ID = { ...BLANK_DOC_IDENTITY, lodgeName: "Example Lodge", lodgeNumber: "1234", provinceName: "Province of Testshire", secretaryEmail: "sec@example.test", emailDomain: "example.test" };

describe("PDF header and file-name helpers use the lodge record", () => {
  it("builds title, subtitle, group and file name from identity", () => {
    expect(docTitle(ID)).toBe("Example Lodge No. 1234");
    expect(docSubtitle(ID)).toBe("No. 1234  —  Province of Testshire");
    expect(docGroupName(ID)).toBe("Example 1234");
    expect(docFileName(ID, "annual-accounts-2025-2026")).toBe("example-annual-accounts-2025-2026");
  });
  it("stays blank when identity is missing (no guessed fallback)", () => {
    expect(docTitle(BLANK_DOC_IDENTITY)).toBe("");
    expect(docSubtitle(BLANK_DOC_IDENTITY)).toBe("");
    expect(docGroupName(BLANK_DOC_IDENTITY)).toBe("");
    expect(docFileName(BLANK_DOC_IDENTITY, "officers-projection-2026")).toBe("officers-projection-2026");
  });
  it("calendar file uses identity; blank identity omits organiser and lodge name", () => {
    const ev = { title: "Meeting", location: "Hall", startTime: "2026-10-21T17:00:00Z" };
    const withId = generateICS(ev, ID);
    expect(withId).toContain("PRODID:-//Example Lodge No 1234//");
    expect(withId).toContain("mailto:sec@example.test");
    expect(withId).toMatch(/UID:[^\r\n]+@example\.test/);
    expect(icsFilename("Meeting", ID.lodgeName)).toBe("meeting-example-lodge.ics");
    const blank = generateICS(ev, {});
    expect(blank).not.toContain("ORGANIZER");
    expect(blank).toContain("PRODID:-//Lodge//");
    expect(icsFilename("Meeting")).toBe("meeting.ics");
  });
  it("public profile secretary address is blank unless a real address is stored", () => {
    expect(parseUnitProfile({ secretary_email: "sec@example.test" }).secretaryEmail).toBe("sec@example.test");
    expect(parseUnitProfile({ secretary_email: null }).secretaryEmail).toBe("");
    expect(parseUnitProfile({ secretary_email: "null" }).secretaryEmail).toBe("");
  });
  it("reminder links use only the saved site address", () => {
    expect(resolveLodgeSettings({ site_url: "https://example.test/" }).configuredSiteUrl).toBe("https://example.test");
    expect(resolveLodgeSettings({ site_url: "" }).configuredSiteUrl).toBe("");
    expect(resolveLodgeSettings(null).configuredSiteUrl).toBe("");
  });
});

// Files moved onto the lodge record in Job U: no host-lodge literals may return.
const GUARDED = [
  "src/lib/docIdentity.ts", "src/lib/generateICS.ts", "src/lib/sendEventInvite.ts",
  "src/components/members/almoner/ReportPanel.tsx", "src/lib/treasurer/reports.ts", "src/lib/treasurer/accountsPackPdf.ts",
  "src/lib/charity/periodicReportPdf.ts", "src/lib/charity/annualReportPdf.ts", "src/lib/development/pdf.ts",
  "src/lib/development/summaryReportPdf.ts", "src/lib/development/gapReportPdf.ts", "src/lib/development/activityReportPdf.ts",
  "src/lib/development/summaryReportText.ts", "src/lib/development/summaryReport.ts", "src/pages/members/OfficersTracker.tsx",
  "src/lib/kpiExports.ts", "src/components/members/treasurer/YearEndTab.tsx", "src/pages/members/development/LodgeSummaryReport.tsx",
  "src/lib/ptpExport.ts", "src/pages/SummonsRedirect.tsx", "src/pages/AccountsRedirect.tsx", "src/pages/CheckoutReturn.tsx",
  "src/pages/Unsubscribe.tsx", "src/pages/NewsletterConfirm.tsx",
  "supabase/functions/almoner-overdue-check/index.ts", "supabase/functions/secretary-returns-reminder/index.ts",
  "supabase/functions/secretary-ugle-reminder/index.ts", "supabase/functions/notify-year-audit/index.ts",
  "supabase/functions/newsletter-unsubscribe/index.ts",
];
// Asset file names (e.g. the crest image path) are not lodge wording, so lines importing @/assets are skipped.
const BANNED = /Weybridge|WEYBRIDGE|6787|weybridgelodge\.org\.uk|Province of Surrey|weybridge-(?!logo)/;

describe("no host-lodge literals in Job U files", () => {
  for (const f of GUARDED) {
    it(f, () => {
      const bad = fs.readFileSync(f, "utf8").split("\n")
        .map((l, i) => [i + 1, l] as const)
        .filter(([, l]) => !/from "@\/assets\//.test(l) && BANNED.test(l));
      expect(bad.map(([n, l]) => `${f}:${n}: ${l.trim()}`)).toEqual([]);
    });
  }
});
