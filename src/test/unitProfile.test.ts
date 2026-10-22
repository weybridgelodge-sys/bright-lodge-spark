import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { parseUnitProfile, unitTitle } from "@/lib/unitProfile";
import { resolveLodgeSettings, returnFileName, LODGE_FALLBACK } from "../../supabase/functions/_shared/lodgeSettingsResolve";

describe("unit profile", () => {
  it("title from name and number", () => expect(unitTitle(parseUnitProfile({ lodge_name: "Sample Lodge", lodge_number: "1234" }))).toBe("Sample Lodge No. 1234"));
  it("venue lines kept in order", () => expect(parseUnitProfile({ venue_lines: ["A,", "B"] }).venueLines).toEqual(["A,", "B"]));
});
describe("server unit settings", () => {
  it("Unit Setup values win over fallbacks", () => {
    const s = resolveLodgeSettings(null, { calendar_feed: { name: "Sample Lodge No. 1234" }, return_files: { provincial: "L1234-Provincial-Return-{year}", installation: "Installation-Return-1234-{year}" }, province: { name: "Province of Sample" } });
    expect(s.calendarName).toBe("Sample Lodge No. 1234");
    expect(s.provinceName).toBe("Province of Sample");
    expect(returnFileName(s.provincialReturnFile, 2026, "pdf")).toBe("L1234-Provincial-Return-2026.pdf");
    expect(returnFileName(s.installationReturnFile, 2026, "pdf")).toBe("Installation-Return-1234-2026.pdf");
  });
  it("blank settings fall back", () => expect(resolveLodgeSettings(null, { calendar_feed: { name: " " } }).calendarName).toBe(LODGE_FALLBACK.calendarName));
  it("file names are made safe", () => expect(returnFileName("a/b:{year}", 2026, "pdf")).toBe("a-b-2026.pdf"));
});
