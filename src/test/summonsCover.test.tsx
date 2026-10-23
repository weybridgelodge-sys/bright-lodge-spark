// Job AM: summons front cover on the shared brand look. Crest from Unit Setup only;
// failure omits the image and the two-page booklet still builds.
import { describe, it, expect, vi } from "vitest";
import zlib from "node:zlib";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { generateSummonsBlob, type LodgeTemplate, type SummonsData } from "@/lib/summonsPdf";
import { summonsCoverIdentity, coverNameSize, SUMMONS_COVER_CREST_PT } from "@/lib/summonsCover";
import type { DocIdentity } from "@/lib/docIdentity";
import { BLANK_DOC_IDENTITY } from "@/lib/docIdentity";

// 1×1 white PNG
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC";
const identity: DocIdentity = { ...BLANK_DOC_IDENTITY, lodgeName: "Testbury Lodge", lodgeNumber: "1234", provinceName: "Testshire" };

const template = {
  lodge_name: "Template Lodge", lodge_number: "999", province: "Templateshire", consecration_date: null,
  logo_url: "https://example.test/old-crest.png", cover_left_image_url: null, cover_right_image_url: null,
  venue_address: "Masonic Hall, High Street", regular_meeting_pattern: null, loi_details: null, provincial_website: null,
  mcf_contact: null, dining_booking_url: null, data_protection_text: null, data_protection_text_short: null,
  overseas_attendance_text: null, progression_notice_text: null, wm_contact: null, secretary_contact: null,
  royal_arch_rep: null, honorary_members: null, lodge_representatives: [],
} as LodgeTemplate;
const summons: SummonsData = {
  meeting_number: 512, meeting_date: "2026-11-12", meeting_time: "6:00pm", meeting_type: "Regular", dress_code: "Dark suit",
  minutes_confirmation_date: null, next_meeting_date: null, officer_night_date: null, agenda: [], candidates: [],
  dining_enquiry_name: null, dining_enquiry_email: null, dining_menu: null, dining_price: null, dining_deadline: null,
};

async function build(crest: { dataUrl: string; format: "PNG" } | null, id = identity) {
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  const run = { crest: async () => { if (!crest) throw new Error("crest failed"); return crest; } } as any;
  const blob = await generateSummonsBlob({ template, officers: [], members: [], summons, brandDeps: { identity: id, crestUrl: "https://x/c.png", run } });
  const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
  fetchSpy.mockRestore();
  const buf = Buffer.from(await blob.arrayBuffer());
  const raw = buf.toString("latin1");
  let text = raw;
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    try { text += zlib.inflateSync(Buffer.from(m[1], "latin1")).toString("latin1"); } catch { /* not deflate */ }
  }
  return { size: buf.length, raw, text, urls, pages: (raw.match(/\/Type\s*\/Page[^s]/g) || []).length };
}

describe("summons cover brand", () => {
  it("Unit Setup identity wins; template only fills blanks", () => {
    expect(summonsCoverIdentity({ identity, crest: null }, template)).toEqual({ name: "Testbury Lodge", number: "1234", province: "Testshire" });
    expect(summonsCoverIdentity({ identity: { ...identity, provinceName: "" }, crest: null }, template).province).toBe("Templateshire");
    expect(summonsCoverIdentity({ identity: null, crest: null }, { lodge_name: "", lodge_number: "", province: "" })).toEqual({ name: "", number: "", province: "" });
  });

  it("crest is 100pt and long names shrink", () => {
    expect(SUMMONS_COVER_CREST_PT).toBe(100);
    expect(coverNameSize("Testbury Lodge No. 1234")).toBe(22);
    expect(coverNameSize("The Lodge of Antiquity and Perpetual Friendship No. 12345")).toBe(14);
  });

  it("builds two pages with the Unit Setup crest and never fetches the template logo", async () => {
    const r = await build({ dataUrl: PNG, format: "PNG" });
    expect(r.pages).toBe(2);
    expect(r.raw).toMatch(/\/Subtype\s*\/Image/);
    expect(r.urls.some((u) => u.includes("old-crest"))).toBe(false);
    expect(r.size).toBeLessThan(200 * 1024);
  }, 30000);

  it("crest failure: booklet still builds, no image", async () => {
    const r = await build(null);
    expect(r.pages).toBe(2);
    expect(r.raw).not.toMatch(/\/Subtype\s*\/Image/);
  }, 30000);

  it("very long lodge name still keeps the booklet to two pages", async () => {
    const r = await build(null, { ...identity, lodgeName: "The Lodge of Antiquity and Perpetual Friendship of the Ancient Borough" });
    expect(r.pages).toBe(2);
  }, 30000);
});
