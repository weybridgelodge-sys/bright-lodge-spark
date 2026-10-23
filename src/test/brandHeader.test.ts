import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import { brandHeaderLines, provincialGrandLodge } from "../../supabase/functions/_shared/transactional-email-templates/_brand";
import { resolveLodgeSettings } from "../../supabase/functions/_shared/lodgeSettingsResolve";
import { createPdfRun, drawBrandHeader, drawBrandFooter, processCrest, crestTargetSize } from "@/lib/pdfBrand";
import { BLANK_DOC_IDENTITY } from "@/lib/docIdentity";

const ID = { ...BLANK_DOC_IDENTITY, lodgeName: "Example Lodge", lodgeNumber: "1234", provinceName: "Province of Testshire" };
const okRes = (type = "image/png") => ({ ok: true, headers: { get: () => type }, blob: async () => new Blob([new Uint8Array([1, 2, 3])], { type }) });

describe("email brand header lines", () => {
  it("builds name, number/province and footer from identity", () => {
    expect(brandHeaderLines({ crestUrl: "https://cdn.example.test/c.png", lodgeName: "Example Lodge", lodgeNumber: "1234", provinceName: "Province of Testshire" }))
      .toEqual({ crestUrl: "https://cdn.example.test/c.png", name: "Example Lodge", sub: "No. 1234 — Province of Testshire", footer: "Example Lodge No. 1234" });
  });
  it("blank or non-https crest is omitted; blank parts skipped", () => {
    expect(brandHeaderLines({ crestUrl: "", lodgeName: "Example Lodge" }).crestUrl).toBeNull();
    expect(brandHeaderLines({ crestUrl: "http://x.test/c.png" }).crestUrl).toBeNull();
    expect(brandHeaderLines(null)).toEqual({ crestUrl: null, name: "", sub: "", footer: "" });
  });
  it("server settings: crest from Unit Setup only, no fallback", () => {
    expect(resolveLodgeSettings(null, { crest_image: { url: " https://cdn.example.test/c.png " } }).crestImageUrl).toBe("https://cdn.example.test/c.png");
    expect(resolveLodgeSettings(null, { crest_image: { url: "http://x.test/c.png" } }).crestImageUrl).toBe("");
    expect(resolveLodgeSettings(null, {}).crestImageUrl).toBe("");
    expect(resolveLodgeSettings(null, {}, {}, { lodgeName: "Example Lodge", lodgeNumber: "1234" })).toMatchObject({ lodgeName: "Example Lodge", lodgeNumber: "1234" });
    expect(resolveLodgeSettings(null).lodgeNumber).toBe("");
  });
});

describe("PDF crest loader", () => {
  it("fetches once per run (cached)", async () => {
    const f = vi.fn(async () => okRes());
    const run = createPdfRun({ fetchImpl: f as any, process: async () => ({ dataUrl: "data:image/png;base64,AA==", format: "PNG" }) });
    const a = await run.crest("https://cdn.example.test/c.png");
    const b = await run.crest("https://cdn.example.test/c.png");
    expect(a?.format).toBe("PNG");
    expect(b).toBe(a);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("omits the crest on failure, HTTP error, wrong type, timeout or blank URL", async () => {
    expect(await createPdfRun({ fetchImpl: (async () => { throw new Error("net"); }) as any }).crest("https://x.test/c.png")).toBeNull();
    expect(await createPdfRun({ fetchImpl: (async () => ({ ...okRes(), ok: false })) as any }).crest("https://x.test/c.png")).toBeNull();
    expect(await createPdfRun({ fetchImpl: (async () => okRes("image/webp")) as any }).crest("https://x.test/c.png")).toBeNull();
    expect(await createPdfRun({ timeoutMs: 20, fetchImpl: (() => new Promise(() => {})) as any }).crest("https://x.test/c.png")).toBeNull();
    const f = vi.fn();
    expect(await createPdfRun({ fetchImpl: f as any }).crest("")).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});

const mockDoc = () => {
  const calls: { fn: string; args: unknown[] }[] = [];
  const rec = (fn: string) => (...args: unknown[]) => { calls.push({ fn, args }); };
  const doc: any = new Proxy({ internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 } }, getNumberOfPages: () => 2,
    getImageProperties: () => ({ width: 100, height: 100 }) }, { get: (t, k: string) => (k in t ? (t as any)[k] : rec(k)) });
  return { doc, calls };
};

describe("PDF brand header", () => {
  it("no crest: no image drawn, name and title still drawn", () => {
    const { doc, calls } = mockDoc();
    const y = drawBrandHeader(doc, { identity: ID, crest: null, title: "Trial Balance", periodLine: "As at 30 Sep 2026" });
    expect(calls.some((c) => c.fn === "addImage")).toBe(false);
    const texts = calls.filter((c) => c.fn === "text").map((c) => c.args[0]);
    expect(texts).toEqual(expect.arrayContaining(["Example Lodge", "No. 1234  —  Province of Testshire", "Trial Balance", "As at 30 Sep 2026"]));
    expect(y).toBe(148);
  });
  it("with crest: image drawn and text moves right of it", () => {
    const { doc, calls } = mockDoc();
    drawBrandHeader(doc, { identity: ID, crest: { dataUrl: "data:image/png;base64,AA==", format: "PNG" }, title: "Trial Balance" });
    expect(calls.some((c) => c.fn === "addImage")).toBe(true);
    expect(calls.find((c) => c.fn === "text" && c.args[0] === "Example Lodge")!.args[1]).toBe(154);
    const img = calls.find((c) => c.fn === "addImage")!.args;
    expect([img[4], img[5]]).toEqual([100, 100]);
  });
  it("footer on every page with lodge title and page count", () => {
    const { doc, calls } = mockDoc();
    drawBrandFooter(doc, ID);
    const texts = calls.filter((c) => c.fn === "text").map((c) => c.args[0]);
    expect(texts).toEqual(["Example Lodge No. 1234", "Page 1 of 2", "Example Lodge No. 1234", "Page 2 of 2"]);
  });
});

// Pilot files: crest only from Unit Setup — no typed crest URL, bundled crest import or host literal.
const PILOT = [
  "supabase/functions/_shared/transactional-email-templates/portal-access-request.tsx",
  "supabase/functions/_shared/transactional-email-templates/_brandHeader.tsx",
  "supabase/functions/_shared/transactional-email-templates/enquiry-notification.tsx",
  "supabase/functions/_shared/transactional-email-templates/period-unlock-requested.tsx",
  "supabase/functions/_shared/transactional-email-templates/year-audit-update.tsx",
  "supabase/functions/_shared/transactional-email-templates/secretary-ugle-missing.tsx",
  "supabase/functions/_shared/transactional-email-templates/secretary-returns-digest.tsx",
  "supabase/functions/_shared/transactional-email-templates/installation-return-submission.tsx",
  "supabase/functions/_shared/transactional-email-templates/provincial-return-submission.tsx",
  "supabase/functions/_shared/transactional-email-templates/summons-distribution.tsx",
  "supabase/functions/_shared/transactional-email-templates/meeting-deadline-reminder.tsx",
  "supabase/functions/_shared/transactional-email-templates/poll-opened.tsx",
  "supabase/functions/_shared/transactional-email-templates/waitlist-promoted.tsx",
  "supabase/functions/_shared/transactional-email-templates/waitlist-refunded.tsx",
  "supabase/functions/_shared/transactional-email-templates/dues-price-change-notice.tsx",
  "supabase/functions/_shared/transactional-email-templates/almoner-overdue-digest.tsx",
  "supabase/functions/_shared/transactional-email-templates/booking-confirmation.tsx",
  "supabase/functions/_shared/transactional-email-templates/booking-notification.tsx",
  "supabase/functions/_shared/transactional-email-templates/event-booking-customer.tsx",
  "supabase/functions/_shared/transactional-email-templates/event-booking-lodge.tsx",
  "supabase/functions/_shared/transactional-email-templates/ladies-festival-confirmation.tsx",
  "supabase/functions/_shared/transactional-email-templates/ladies-festival-notification.tsx",
  "supabase/functions/_shared/transactional-email-templates/enquiry-confirmation.tsx",
  "supabase/functions/send-summons-to-visitors/index.ts",
  "src/lib/sendEventInvite.ts",
  "supabase/functions/broadcast-newsletter/index.ts",
  "supabase/functions/_shared/newsletterBrand.ts",
  "src/lib/newsletterBrand.ts",
  "src/pages/members/admin/NewsletterHub.tsx",
  "src/lib/pdfBrand.ts", "src/lib/treasurer/brandedReportDoc.ts", "src/components/members/treasurer/TrialBalanceReport.tsx",
  "src/lib/kpiExports.ts",
  "src/lib/almonerReportPdf.ts", "src/components/members/almoner/ReportPanel.tsx",
  "src/lib/treasurer/reports.ts", "src/lib/treasurer/accountsPackPdf.ts", "src/pages/members/admin/MeetingMinutes.tsx",
  "src/components/members/treasurer/IncomeExpenditureReport.tsx", "src/components/members/treasurer/BalanceSheetReport.tsx",
  "src/components/members/treasurer/BankReconciliationTab.tsx", "src/components/members/treasurer/EventAccountsTab.tsx",
  "src/components/members/treasurer/PropertyRegisterTab.tsx",
  "src/lib/treasurer/bankRecPdf.ts",
  "src/lib/charity/annualReportPdf.ts", "src/lib/charity/periodicReportPdf.ts",
  "src/lib/development/pdf.ts", "src/lib/development/gapReportPdf.ts", "src/lib/development/summaryReportPdf.ts", "src/lib/development/activityReportPdf.ts",
  "src/lib/officersProjectionPdf.ts", "src/pages/members/OfficersTracker.tsx",
  "src/lib/summonsCover.tsx",
  "supabase/functions/_shared/pdfLibBrand.ts", "supabase/functions/_shared/newsletterArchivePdf.ts",
  "supabase/functions/_shared/email-templates/_layout.tsx", "supabase/functions/_shared/authEmailBrand.ts", "supabase/functions/_shared/newsletterDispatch.ts",
  "supabase/functions/_shared/email-templates/signup.tsx", "supabase/functions/_shared/email-templates/invite.tsx",
  "supabase/functions/_shared/email-templates/magic-link.tsx", "supabase/functions/_shared/email-templates/recovery.tsx",
  "supabase/functions/_shared/email-templates/email-change.tsx", "supabase/functions/_shared/email-templates/reauthentication.tsx",
  "supabase/functions/auth-email-hook/index.ts",
];

describe("summons cover crest comes only from Unit Setup", () => {
  const src = fs.readFileSync("src/lib/summonsPdf.tsx", "utf8");
  it("summons PDF never reads the template logo or its typed default", () => {
    expect(src).not.toMatch(/LOGO_URL|logo_url\b(?!: string)/);
    expect(src).not.toMatch(/@\/assets\/|\.asset\.json/);
  });
});
const BANNED = /LOGO_URL|LOGO_WIDTH|LOGO_HEIGHT|crestWrap|LODGE_NAME|@\/assets\/|\.asset\.json|lovable\.app|__l5e|weybridge|6787|Province of Surrey|Guildford|Consecrated 1949|\.org\.uk/i;
describe("pilot files carry no typed crest or host literal", () => {
  for (const f of PILOT) it(f, () => {
    // Known exceptions: KPI visitor rows' own lodge_name field (not a host literal); sender domain (stays in code by rule); enquiry-confirmation body names the town (no Unit Setup field for it yet).
    const bad = fs.readFileSync(f, "utf8").split("\n").filter((l) => BANNED.test(l) && !/curious about Freemasonry here in Guildford\.$/.test(l.trim()) && !/^const lodge = \(v\.lodge_name \?\? ""\)\.trim\(\);$/.test(l.trim()) && !/^const (FROM_ADDRESS_DOMAIN|SENDER_DOMAIN|FROM_DOMAIN) = /.test(l.trim())
      // Sending setup in auth-email-hook (sender/link domains, preview-only sample URL); never email wording.
      && !/^const (ROOT_DOMAIN|SAMPLE_PROJECT_URL) = "[^"]*"$/.test(l.trim()));
    expect(bad).toEqual([]);
  });
});

describe("provincial return letter province wording", () => {
  const src = fs.readFileSync("supabase/functions/_shared/transactional-email-templates/provincial-return-submission.tsx", "utf8");
  it("has no typed province", () => { expect(src).not.toMatch(/Surrey/); });
  it("takes the province from settings; blank gives the neutral wording", () => {
    expect(provincialGrandLodge("Province of Testshire")).toBe("Provincial Grand Lodge of Testshire");
    expect(provincialGrandLodge("Testshire")).toBe("Provincial Grand Lodge of Testshire");
    expect(provincialGrandLodge("")).toBe("Provincial Grand Lodge");
    expect(provincialGrandLodge(null)).toBe("Provincial Grand Lodge");
  });
});

describe("crest processing", () => {
  const canvas = (png = "data:image/png;base64,LONGLONGLONG", jpg = "data:image/jpeg;base64,SHORT") => {
    const ops: string[] = [];
    const ctx: any = { set fillStyle(v: string) { ops.push(`fill:${v}`); }, fillRect: () => ops.push("fillRect"), drawImage: (_b: unknown, _x: number, _y: number, w: number, h: number) => ops.push(`draw:${w}x${h}`) };
    let size = "";
    return { ops, get size() { return size; }, deps: { decode: async () => ({ width: 1006, height: 1006 }), createCanvas: (w: number, h: number) => { size = `${w}x${h}`; return { width: w, height: h, getContext: () => ctx, toDataURL: (t: string) => (t === "image/png" ? png : jpg) }; } } };
  };
  it("downscales to 400px long side, never upscales", () => {
    expect(crestTargetSize(1006, 1006)).toEqual({ width: 400, height: 400 });
    expect(crestTargetSize(1000, 500)).toEqual({ width: 400, height: 200 });
    expect(crestTargetSize(200, 100)).toEqual({ width: 200, height: 100 });
  });
  it("flattens onto white before drawing and keeps the smaller encoding", async () => {
    const c = canvas();
    const out = await processCrest(new Blob([]), c.deps as any);
    expect(c.size).toBe("400x400");
    expect(c.ops).toEqual(["fill:#ffffff", "fillRect", "draw:400x400"]);
    expect(out?.format).toBe("JPEG");
    const c2 = canvas("data:image/png;base64,S", "data:image/jpeg;base64,MUCHLONGER");
    expect((await processCrest(new Blob([]), c2.deps as any))?.format).toBe("PNG");
  });
  it("any failure gives null", async () => {
    expect(await processCrest(new Blob([]), { decode: async () => { throw new Error("bad"); }, createCanvas: () => { throw new Error(); } } as any)).toBeNull();
    const c = canvas("data:,", "data:,");
    expect(await processCrest(new Blob([]), c.deps as any)).toBeNull();
  });
});

describe("sign-in email wording has no typed lodge name", () => {
  const hook = fs.readFileSync("supabase/functions/auth-email-hook/index.ts", "utf8");
  it("no SITE_NAME or FROM_NAME literal; sender name comes from Unit Setup", () => {
    expect(hook).not.toMatch(/\b(SITE_NAME|FROM_NAME)\b/);
    expect(hook).toMatch(/from: `\$\{name\} <noreply@\$\{FROM_DOMAIN\}>`/);
  });
});
