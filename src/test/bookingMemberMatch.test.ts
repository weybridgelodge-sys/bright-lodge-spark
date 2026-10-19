import { describe, it, expect } from "vitest";
import { matchBookingToMember, type MatchProfile } from "@/lib/bookingMemberMatch";

const profiles: MatchProfile[] = [
  { id: "m1", email: "john.smith@example.com", first_name: "John", last_name: "Smith", status: "active" },
  { id: "m2", email: "old@example.com", first_name: "Peter", last_name: "Gone", status: "resigned" },
];

describe("booking member match", () => {
  it("links by email even when booked as Mr with his own name as lodge", () => {
    expect(
      matchBookingToMember({ email: " John.Smith@Example.com ", firstName: "Johnny", lastName: "X" }, profiles),
    ).toEqual({ kind: "member", memberId: "m1" });
  });

  it("leaves a non-member visitor email as a visitor", () => {
    expect(
      matchBookingToMember({ email: "visitor@other.org", firstName: "Alan", lastName: "Jones" }, profiles),
    ).toEqual({ kind: "visitor" });
  });

  it("flags, but does not link, a name-only match", () => {
    expect(
      matchBookingToMember({ email: "different@home.net", firstName: "john", lastName: "SMITH" }, profiles),
    ).toEqual({ kind: "flag", suspectedMemberId: "m1" });
  });

  it("ignores inactive members", () => {
    expect(matchBookingToMember({ email: "old@example.com", firstName: "Peter", lastName: "Gone" }, profiles)).toEqual({
      kind: "visitor",
    });
  });
});
