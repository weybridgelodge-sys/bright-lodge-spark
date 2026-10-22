import { describe, it, expect } from "vitest";
import { linkedPageLine, meetingLinkPayload } from "@/lib/meetingEventLink";

describe("register meeting link", () => {
  const events = [{ id: "e1", title: "December Meeting", event_date: "2026-12-09" }];
  it("writes only the event id, never a booking key", () => {
    expect(meetingLinkPayload("e1")).toEqual({ lodge_event_id: "e1" });
    expect(meetingLinkPayload(null)).toEqual({ lodge_event_id: null });
    expect(Object.keys(meetingLinkPayload(null))).not.toContain("event_key");
  });
  it("shows the linked title or not linked", () => {
    expect(linkedPageLine("e1", events)).toBe("Linked booking page: December Meeting");
    expect(linkedPageLine(null, events)).toBe("Not linked to a public booking page");
  });
});
