import { describe, expect, it } from "vitest";
import { portalBookPath, shouldRedirectToPortal } from "@/lib/portalBooking";

const base = { signedIn: true, activeMember: true, switchOn: true, search: "" };
describe("public Bookings → portal redirect", () => {
  it("redirects a signed-in active member when the switch is on", () => expect(shouldRedirectToPortal(base)).toBe(true));
  it("never redirects a visitor", () => expect(shouldRedirectToPortal({ ...base, signedIn: false })).toBe(false));
  it("never redirects while the switch is off", () => expect(shouldRedirectToPortal({ ...base, switchOn: false })).toBe(false));
  it("never redirects a signed-in non-member", () => expect(shouldRedirectToPortal({ ...base, activeMember: false })).toBe(false));
  it("keeps deep links with a query on the public page", () => expect(shouldRedirectToPortal({ ...base, search: "?ref=qr" })).toBe(false));
});
describe("Book button target", () => {
  it("meetings book inside the portal", () => expect(portalBookPath({ kind: "meeting", id: "m1", book_path: "/bookings" })).toBe("/members/book/meeting/m1"));
  it("events keep their public page", () => expect(portalBookPath({ kind: "event", id: "e1", book_path: "/events/x" })).toBe("/events/x"));
});
