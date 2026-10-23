import { describe, expect, it } from "vitest";
import { omittedPosts, printableOfficers, printableReps } from "@/lib/summonsOfficers";

const roll = [
  { label: "Worshipful Master", member: "W Bro. A One" },
  { label: "Senior Warden", member: "Bro. B Two" },
  { label: "Secretary", member: "W Bro. C Three" },
  { label: "Assistant Secretary", member: "" },
  { label: "Charity Steward", member: "Bro. B Two" },
  { label: "Tyler", member: "Mr D Four" },
];

describe("summons officer lines", () => {
  it("omits a vacant post", () => {
    expect(printableOfficers(roll).map((o) => o.label)).not.toContain("Assistant Secretary");
  });
  it("keeps a free-text (non-member) name", () => {
    expect(printableOfficers(roll).find((o) => o.label === "Tyler")?.member).toBe("Mr D Four");
  });
  it("prints a member holding two offices twice", () => {
    expect(printableOfficers(roll).filter((o) => o.member === "Bro. B Two")).toHaveLength(2);
  });
  it("keeps the order of the rest", () => {
    expect(printableOfficers(roll).map((o) => o.label)).toEqual(["Worshipful Master", "Senior Warden", "Secretary", "Charity Steward", "Tyler"]);
  });
  it("treats whitespace-only names as vacant", () => {
    expect(printableOfficers([{ label: "Treasurer", member: "  " }])).toEqual([]);
  });
  it("lists omitted posts for the builder", () => {
    expect(omittedPosts(roll).all).toEqual(["Assistant Secretary"]);
    expect(omittedPosts(roll).keyVacant).toEqual([]);
  });
  it("warns when a key post is empty", () => {
    const r = omittedPosts([...roll, { label: "Treasurer", member: null }, { label: "Junior Warden", member: "" }]);
    expect(r.keyVacant).toEqual(["Treasurer", "Junior Warden"]);
  });
  it("omits an empty rep and reports it", () => {
    const reps = [{ role: "Sports", name: "Bro. E" }, { role: "Halls", name: "" }];
    expect(printableReps(reps).map((r) => r.role)).toEqual(["Sports"]);
    expect(omittedPosts([], reps).all).toEqual(["Halls"]);
  });
});
