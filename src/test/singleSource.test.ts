import { describe, it, expect, vi } from "vitest";
import fs from "fs";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { resolveRepresentatives } from "@/lib/representatives";
import { installationRuleWording, parseLodgeIdentity, lodgeTitle } from "@/lib/lodgeIdentity";
import { publicMeetingPattern } from "@/lib/meetingPattern";
import { lodgeEventSavePayload, publicEventHeading, type LodgeEvent } from "@/lib/lodgeEvents";
import { lodgeLine, fileBase } from "@/lib/provincialReturn";
import { formLodge, formNumber } from "../../supabase/functions/_shared/provincialReturnDoc";

// Files that must read lodge identity from records, never typed literals.
const GUARDED = [
  "src/lib/installationReturn.ts",
  "src/lib/provincialReturn.ts",
  "src/lib/lodgeIdentity.ts",
  "src/lib/representatives.ts",
  "src/lib/summonsSources.ts",
  "src/pages/members/admin/InstallationReturn.tsx",
  "src/pages/members/admin/ProvincialReturn.tsx",
  "supabase/functions/_shared/provincialReturnDoc.ts",
  "supabase/functions/generate-provincial-return/index.ts",
  "supabase/functions/sign-installation-return/index.ts",
  "supabase/functions/_shared/returnSigners.ts",
  "supabase/functions/_shared/ugleReturnSignatures.ts",
];
// Booking form, portal booking pages and Unit Setup: also no bank details or sign-offs.
const BOOKING_GUARDED = [
  "src/components/bookings/MeetingBookingForm.tsx",
  "src/pages/Bookings.tsx",
  "src/pages/members/BookMeeting.tsx",
  "src/pages/members/BookMyPlace.tsx",
  "src/pages/members/admin/UnitSetup.tsx",
  "src/lib/bookingDetails.ts",
  "src/lib/unitProfile.ts",
  "src/components/Footer.tsx",
  "src/components/Header.tsx",
];
// Server functions switched to Unit Setup: no lodge name/number, social links or venue typed.
const SERVER_GUARDED = [
  "supabase/functions/send-summons-to-visitors/index.ts",
  "supabase/functions/broadcast-newsletter/index.ts",
  "supabase/functions/member-calendar-feed/index.ts",
  "supabase/functions/submit-provincial-return/index.ts",
  "supabase/functions/submit-installation-return/index.ts",
  "supabase/functions/_shared/send-booking-emails.ts",
];
const SERVER_BANNED: [string, RegExp][] = [
  ["lodge number", /\b6787\b/],
  ["lodge name text", /Weybridge Lodge/],
  ["social link", /(facebook|instagram|twitter)\.com/i],
  ["venue", /Masonic Centre|GU2 4DR|Hitherbury|Weybourne/i],
  ["mailbox", /(assistantsecretary|secretary|treasurer)@/i],
];
describe("switched server functions carry no typed lodge details", () => {
  for (const f of SERVER_GUARDED) {
    it(f, () => {
      // Sender domains and the hosted logo stay in code (tied to verified sending infrastructure).
      const src = fs.readFileSync(f, "utf8").split("\n").filter((l) => !/(SENDER_DOMAIN|FROM_DOMAIN|FROM_ADDRESS_DOMAIN|LOGO_URL) =/.test(l)).join("\n");
      for (const [what, re] of SERVER_BANNED) expect(src.match(re)?.[0] ?? null, `${what} in ${f}`).toBeNull();
    });
  }
});
const BANNED: [string, RegExp][] = [
  ["lodge name", /weybridge/i],
  ["lodge number", /\b6787\b/],
  ["consecration date", /1949/],
  ["URL", /https?:\/\/(?!localhost)[a-z0-9.-]+\.[a-z]{2,}/i],
  ["email", /[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z.]{2,}/i],
  ["UUID", /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i],
];

const BANK: [string, RegExp][] = [
  ["lodge number", /\b6787\b/],
  ["lodge name text", />\s*Weybridge Lodge|"Weybridge Lodge|Weybridge Lodge No/],
  ["social link", /(facebook|instagram|twitter)\.com/i],
  ["venue", /Hitherbury|Weybourne|GU2 4DR/i],
  ["ICO number", /ZC\d{6}/],
  ["bank account number", /\b\d{8}\b/],
  ["sort code", /\b\d{2}-\d{2}-\d{2}\b|\b\d{6}\b/],
  ["sign-off with lodge", /Fraternally,\\nWM [A-Z]/],
  ["lodge email", /[a-z0-9._%+-]+@(?!example\.)[a-z0-9-]+\.[a-z.]{2,}/i],
];
describe("booking pages carry no typed lodge, bank or sign-off details", () => {
  for (const f of BOOKING_GUARDED) {
    it(f, () => {
      // Search-engine title is static by design (must match the pre-rendered head; staticMetaParity).
      const src = fs.readFileSync(f, "utf8").split("\n").filter((l) => !/title="Dining & Bookings \||description=\{`Book your place/.test(l)).join("\n");
      for (const [what, re] of BANK) expect(src.match(re)?.[0] ?? null, `${what} in ${f}`).toBeNull();
    });
  }
});

describe("no typed lodge details", () => {
  for (const f of GUARDED) {
    it(f, () => {
      const src = fs.readFileSync(f, "utf8");
      for (const [what, re] of BANNED) expect(src.match(re)?.[0] ?? null, `${what} in ${f}`).toBeNull();
    });
  }
  it("summons defaults carry no lodge name or number", () => {
    const src = fs.readFileSync("src/pages/members/SummonsBuilder.tsx", "utf8");
    const block = src.slice(src.indexOf("const EMPTY_TEMPLATE"), src.indexOf("const EMPTY_TEMPLATE") + 200);
    expect(block).toContain('lodge_name: ""');
    expect(block).toContain('lodge_number: ""');
    expect(src).not.toMatch(/\b6787\b/);
  });
  it("unit helpers have no typed unit", () => {
    for (const f of ["src/lib/meetingPattern.ts", "src/lib/joinUsCosts.ts", "src/lib/contactSettings.ts"]) {
      expect(fs.readFileSync(f, "utf8")).not.toMatch(/['"]weybridge['"]/);
    }
  });
});

describe("representatives rule", () => {
  const positions = [
    { key: "rep_sports", label: "Sports Rep", order_index: 1, category: "representative", include_in: { summons: true, provincial_return: true } },
    { key: "rep_halls", label: "Halls Rep", order_index: 2, category: "representative", include_in: { summons: true } },
  ];
  const tpl = { lodge_representatives: [{ role: "Rep to Sports", name: "Typed Member Name", member_id: "m1" }, { role: "Rep to Halls", name: "Bro A Visitor" }] };
  it("an appointment wins over template text and keeps the template's role wording", () => {
    const r = resolveRepresentatives({ year: 2026, consumer: "summons", positions, appts: [{ position_key: "rep_sports", member_id: "m2", lodge_year: 2026 }], template: tpl });
    expect(r[0]).toMatchObject({ member_id: "m2", source: "appointment", role: "Rep to Sports" });
  });
  it("carries the latest earlier appointment forward", () => {
    const r = resolveRepresentatives({ year: 2027, consumer: "summons", positions, appts: [{ position_key: "rep_sports", member_id: "m2", lodge_year: 2025 }], template: null });
    expect(r[0]).toMatchObject({ member_id: "m2", source: "carried", fromYear: 2025 });
  });
  it("uses template text only for a non-member name", () => {
    const r = resolveRepresentatives({ year: 2026, consumer: "summons", positions, appts: [], template: tpl });
    expect(r[0]).toMatchObject({ source: "none", name: "" }); // template entry was member-linked: no typed fallback
    expect(r[1]).toMatchObject({ source: "template", name: "Bro A Visitor" });
  });
  it("ignores projections and positions not opted in", () => {
    const r = resolveRepresentatives({ year: 2026, consumer: "provincial_return", positions, appts: [{ position_key: "rep_sports", member_id: "m2", lodge_year: 2026, is_projection: true }], template: null });
    expect(r.map((x) => x.key)).toEqual(["rep_sports"]);
    expect(r[0].source).toBe("none");
  });
});

describe("lodge identity and installation wording", () => {
  it("derives the by-law wording from the rule", () => {
    expect(installationRuleWording({ mode: "weekday_rule", installation_month: 10, installation_ordinal: "3", installation_weekday: 3 })).toBe("3rd Wednesday in October");
    expect(installationRuleWording({ mode: "fixed_date", installation_month: 5, fixed_day: 12 })).toBe("12 May");
    expect(installationRuleWording(null)).toBe("");
  });
  it("leaves missing identity blank instead of guessing", () => {
    const id = parseLodgeIdentity({ lodge_name: "Test Lodge", lodge_number: "", secretary_email: "sec@example.org" });
    expect(id.emailDomain).toBe("example.org");
    expect(lodgeTitle(id)).toBe("Test Lodge");
    expect(lodgeLine(id)).toBe("TEST");
    expect(fileBase(2026, "")).toBe("PROVINCIAL_RETURN_2026-2027");
    expect([formLodge({ lodgeName: "Test Lodge" }), formNumber({ lodgeNumber: "1234" })]).toEqual(["TEST", "L1234"]);
  });
});

describe("public meeting pattern", () => {
  it("is null with no saved schedule, so the page keeps its text", () => {
    expect(publicMeetingPattern({ schedule: [] })).toBeNull();
  });
  it("lists saved meetings in month order with day and count", () => {
    const p = publicMeetingPattern({ schedule: [
      { month: 10, ordinal: "3", weekday: 3, meeting_type: "installation" },
      { month: 2, ordinal: "3", weekday: 3, meeting_type: "regular" },
    ] });
    expect(p).toEqual({ items: ["3rd Wednesday in February", "3rd Wednesday in October (Installation)"], meetingDay: "Wednesday", perYear: 2 });
  });
});

describe("meeting event heading", () => {
  const ev = { title: "December Meeting", intro_heading: "April Meeting", event_label: "", intro: "", event_date: "2026-12-09", tyling_time: "", dining_time: "", location: "", dress_code: "", booking_deadline: null, header_image_url: null, published: true } as unknown as LodgeEvent;
  it("prints the Title, never a hidden heading", () => {
    expect(publicEventHeading(ev)).toBe("December Meeting");
  });
  it("clears intro_heading on save", () => {
    expect(lodgeEventSavePayload(ev, "s").intro_heading).toBeNull();
  });
});

describe("seeded bank/sign-off values never typed in src or edge functions", () => {
  it("no bank literals anywhere", () => {
    const { execSync } = require("child_process");
    const hits = execSync(`rg -l -e ${"1487" + "8862"} -e ${"30-99" + "-80"} -e ${"3099" + "80"} src supabase/functions || true`, { encoding: "utf8" }).trim();
    expect(hits).toBe("");
  });
  for (const f of ["supabase/functions/_shared/duplicate-booking.ts", "src/pages/CheckoutReturn.tsx", "supabase/functions/_shared/lodgeSettingsResolve.ts", "supabase/functions/create-checkout/index.ts"]) {
    it(`${f}: no typed Assistant Secretary address`, () => {
      expect(fs.readFileSync(f, "utf8")).not.toMatch(/assistantsecretary@/i);
    });
  }
  for (const f of ["supabase/functions/_shared/duplicate-booking.ts", "src/pages/CheckoutReturn.tsx"]) {
    it(`${f}: no lodge name, domain, email or UUID literals`, () => {
      const src = fs.readFileSync(f, "utf8");
      expect(src).not.toMatch(/weybridge|6787|[\w.-]+@[\w-]+\.[a-z]{2,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    });
  }
  it("public Bookings page has no typed contact email", () => {
    const src = fs.readFileSync("src/pages/Bookings.tsx", "utf8");
    expect(src).not.toMatch(/assistantsecretary@/);
  });
});
