import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  parseLodgeFigures, membersLabel, longDate, totalMembers, ageRangePhrase, glanceStats, provinceShort, BLANK_FIGURES, ordinalDay,
} from "@/lib/lodgeFigures";
import { manualMeetingPattern, publicMeetingPattern } from "@/lib/meetingPattern";
import { parseUnitProfile, venueAddress, venueFull, venueShort, isUnitVenue } from "@/lib/unitProfile";
import { venueFor } from "@/data/events";
import { pastMasterTerms } from "@/lib/pastMastersRoll";

const live = { subscribing_count: 21, honorary_count: 1, average_age: 55.5, youngest_age: 32, oldest_age: 82, latest_initiation_date: "2026-05-13" };
const unit = parseUnitProfile({
  lodge_number: "100", consecration_date: "1949-01-19", province_name: "Province of Testshire",
  venue_name: "Test Hall", venue_lines: ["Test Hall, Main House,", "High Street,", "Townley TE1 2ST"],
});

describe("public lodge figures shaping", () => {
  it("parses the aggregate", () => {
    const f = parseLodgeFigures(live);
    expect(f).toEqual({ subscribingCount: 21, honoraryCount: 1, averageAge: 55.5, youngestAge: 32, oldestAge: 82, latestInitiationDate: "2026-05-13" });
    expect(membersLabel(f)).toBe("21 (plus 1 honorary)");
    expect(totalMembers(f)).toBe(22);
    expect(ageRangePhrase(f)).toBe("from 32 to 82");
    expect(longDate(f.latestInitiationDate)).toBe("13th May 2026");
  });
  it("is blank-safe", () => {
    expect(parseLodgeFigures(null)).toEqual(BLANK_FIGURES);
    expect(parseLodgeFigures({ average_age: "x", latest_initiation_date: "nope" })).toEqual(BLANK_FIGURES);
    expect(membersLabel(BLANK_FIGURES)).toBe("—");
    expect(totalMembers(BLANK_FIGURES)).toBeNull();
    expect(ageRangePhrase(BLANK_FIGURES)).toBe("");
    expect(longDate("")).toBe("");
  });
  it("ordinal days", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinalDay)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "31st"]);
  });
  it("glance cards show — for everything when nothing is known", () => {
    const cards = glanceStats(BLANK_FIGURES, parseUnitProfile(null), null);
    expect(cards.every((c) => c.value === "—")).toBe(true);
  });
  it("glance cards from records", () => {
    const pattern = manualMeetingPattern("3rd Wednesday in February, 2nd Wednesday in May, 3rd Wednesday\nin October (Installation) and 2nd Wednesday in December.");
    const v = Object.fromEntries(glanceStats(parseLodgeFigures(live), unit, pattern).map((c) => [c.label, c.value]));
    expect(v).toEqual({
      "Lodge Number": "100", Consecrated: "19th January 1949", "Subscribing Members": "21 (plus 1 honorary)",
      "Average Member Age": "55.5", "Meeting Day": "Wednesday", "Meetings Per Year": "4",
      "Most Recent Initiation": "13th May 2026", Province: "Testshire",
    });
    expect(provinceShort("")).toBe("");
  });
});

describe("meeting pattern from records", () => {
  it("splits the saved text into one line per meeting", () => {
    const p = manualMeetingPattern("3rd Wednesday in February, 2nd Wednesday in May, 3rd Wednesday\nin October (Installation) and 2nd Wednesday in December.");
    expect(p?.items).toEqual(["3rd Wednesday in February", "2nd Wednesday in May", "3rd Wednesday in October (Installation)", "2nd Wednesday in December"]);
    expect(p?.perYear).toBe(4);
  });
  it("no schedule and no text → null (page hides it)", () => {
    expect(publicMeetingPattern({ schedule: [], manual_text: null })).toBeNull();
    expect(manualMeetingPattern("  ")).toBeNull();
  });
  it("uses saved text when the Diary has no schedule", () => {
    expect(publicMeetingPattern({ schedule: [], manual_text: "1st Monday in March" })?.items).toEqual(["1st Monday in March"]);
  });
});

describe("venue from Unit Setup", () => {
  it("builds name/address lines", () => {
    expect(venueAddress(unit)).toBe("Main House, High Street, Townley TE1 2ST");
    expect(venueFull(unit)).toBe("Test Hall, Main House, High Street, Townley TE1 2ST");
    expect(venueShort(unit)).toBe("Test Hall, TE1 2ST");
    expect(isUnitVenue("the test hall", unit)).toBe(true);
  });
  it("event's own venue wins; blank falls back to the unit; nothing when unset", () => {
    expect(venueFor("Village Pub", unit)).toEqual({ venue: "Village Pub" });
    expect(venueFor(null, unit)).toEqual({ venue: "Test Hall", address: "Main House, High Street, Townley TE1 2ST" });
    expect(venueFor(null, parseUnitProfile(null))).toEqual({ venue: "" });
    expect(venueFull(parseUnitProfile(null))).toBe("");
  });
});

describe("Past Masters roll terms", () => {
  it("keeps linked rows only", () => {
    expect(pastMasterTerms([{ member_id: "a", lodge_year: 2016 }, { member_id: null, lodge_year: 1990 }])).toEqual([{ member_id: "a", year_started: 2016 }]);
    expect(pastMasterTerms(null)).toEqual([]);
  });
});

describe("repo guard: no typed venue or old Lodge Profile figures (Job Z files)", () => {
  const files = [
    "src/components/NextMeeting.tsx", "src/data/events.ts", "src/lib/publicEventFormat.ts", "src/lib/publicEvents.ts",
    "src/pages/members/admin/LoiSchedule.tsx", "src/pages/members/Calendar.tsx", "src/pages/PublicEvent.tsx",
    "src/pages/members/PublicEventsAdmin.tsx", "src/lib/unitProfile.ts", "src/lib/lodgeFigures.ts", "src/lib/meetingPattern.ts",
    "src/pages/LodgeProfile.tsx",
  ];
  const banned = [/Guildford Masonic/i, /Hitherbury/i, /GU2 4DR/i, /weybridgelodge\.org\.uk/i, /22 members/, /18 to 83/, /13th May 2026/, /19th January 1949/, /value: "53"/, /value: "6787"/, /22 \(incl\. 1 honorary\)/];
  for (const f of files) {
    it(f, () => {
      let src = readFileSync(f, "utf8");
      // Lodge Profile's SEO title/description and JSON-LD stay typed (pre-rendered SEO, separate batch).
      if (f.endsWith("LodgeProfile.tsx")) src = src.replace(/const pageSchema[\s\S]*?<a href="#main-content"/, "");
      for (const b of banned) expect(src, `${f} contains ${b}`).not.toMatch(b);
    });
  }
});
