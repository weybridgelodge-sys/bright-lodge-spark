import { describe, expect, it } from "vitest";
import { matchesPublicCalendarEvent, publicCalendarTimes, upcomingPublicCalendarRows } from "../../supabase/functions/_shared/publicEventCalendar";

const christmas = { id: "christmas", slug: "christmas-party-2026", public_title: "Joint Christmas Party at Guildford Masonic Centre", name: "Christmas Party 2026", event_date: "2026-12-19", start_time: "17:00:00", end_time: "00:00:00", venue: "Guildford Masonic Centre", is_public: true, archived_at: null };
const now = new Date("2026-10-15T13:43:00Z");

describe("public calendar rules used by website and member feed", () => {
  it("includes a published Christmas party on 19 December", () => {
    expect(upcomingPublicCalendarRows([christmas], now)).toEqual([christmas]);
  });
  it("excludes unpublished events", () => {
    expect(upcomingPublicCalendarRows([{ ...christmas, is_public: false }], now)).toEqual([]);
  });
  it("excludes archived events", () => {
    expect(upcomingPublicCalendarRows([{ ...christmas, archived_at: "2026-10-14" }], now)).toEqual([]);
  });
  it("excludes events without a slug", () => {
    expect(upcomingPublicCalendarRows([{ ...christmas, slug: "" }], now)).toEqual([]);
  });
  it("excludes past events using the London date", () => {
    expect(upcomingPublicCalendarRows([christmas], new Date("2026-12-20T00:00:00Z"))).toEqual([]);
    expect(upcomingPublicCalendarRows([{ ...christmas, event_date: "2026-10-15" }], new Date("2026-10-15T23:30:00Z"))).toEqual([]);
  });
  it("ends the 5 pm to midnight party on the following day", () => {
    expect(publicCalendarTimes(christmas)).toEqual({ start: "2026-12-19T17:00:00", end: "2026-12-20T00:00:00" });
  });
  it("matches existing records by slug or either title only on the same day", () => {
    expect(matchesPublicCalendarEvent(christmas, { date: "2026-12-19", title: "Meeting: Christmas Party 2026" })).toBe(true);
    expect(matchesPublicCalendarEvent(christmas, { date: "2026-12-19", title: "Other title", slug: christmas.slug })).toBe(true);
    expect(matchesPublicCalendarEvent(christmas, { date: "2026-12-20", title: christmas.public_title })).toBe(false);
    expect(matchesPublicCalendarEvent(christmas, { date: "2026-12-19", title: "Another social event" })).toBe(false);
  });
});