import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { reportGroup, paidTicketTotal, lodgeDisplay, statusLabel, isPdfSafe, amountDue } from "@/lib/treasurer/eventBookingReport";
import { parseGuestRequests, cleanGuestRequests, guestRequestsPreview } from "@/lib/guestRequests";
import { validateEventForm } from "@/lib/formErrors";
import { buildDuplicatePayload } from "@/lib/eventDuplicate";

const NOW = Date.parse("2026-10-25T20:00:00Z");
const base = { deposit_paid: false, balance_paid: false, deposit_pence: 0, balance_pence: 3590, total_pence: 3590, amount_paid_pence: 0, ticket_count: 1, payment_method: "card", created_at: "2026-10-25T19:50:00Z" };

describe("event account PDF: paid vs awaiting", () => {
  const paid = { ...base, payment_status: "paid", balance_paid: true, amount_paid_pence: 3590, ticket_count: 2 };
  const pending = { ...base, payment_status: "pending", ticket_count: 3 };
  it("paid counts, pending awaits", () => {
    expect(reportGroup(paid, NOW)).toBe("paid");
    expect(reportGroup(pending, NOW)).toBe("awaiting");
    expect(paidTicketTotal([paid, pending], NOW)).toBe(2);
  });
  it("deposit paid counts as paid", () => expect(reportGroup({ ...base, payment_status: "deposit_paid", deposit_paid: true }, NOW)).toBe("paid"));
  it("missing or unknown status awaits, never paid or dropped", () => {
    expect(reportGroup({ ...base, payment_status: null }, NOW)).toBe("awaiting");
    expect(reportGroup({ ...base, payment_status: "weird" }, NOW)).toBe("awaiting");
    expect(statusLabel({ ...base, payment_status: null })).toBe("Awaiting payment");
  });
  it("cancelled, expired and lapsed card holds are hidden", () => {
    expect(reportGroup({ ...base, payment_status: "cancelled" }, NOW)).toBe("hidden");
    expect(reportGroup({ ...base, payment_status: "expired" }, NOW)).toBe("hidden");
    expect(reportGroup({ ...pending, created_at: "2026-10-25T19:00:00Z" }, NOW)).toBe("hidden");
    expect(reportGroup({ ...pending, payment_method: "bank_transfer", created_at: "2026-10-01T00:00:00Z" }, NOW)).toBe("awaiting");
  });
  it("refunded stays listed but adds no tickets", () => {
    const r = { ...paid, payment_status: "refunded" };
    expect(reportGroup(r, NOW)).toBe("paid");
    expect(paidTicketTotal([r], NOW)).toBe(0);
  });
  it("amount due is what is left", () => expect(amountDue(pending)).toBe(3590));
});

describe("PDF uses only drawable characters", () => {
  it("no tick or other non-WinAnsi glyph in the PDF code", () => {
    const src = readFileSync("src/components/members/treasurer/EventAccountsTab.tsx", "utf8");
    const pdf = src.slice(src.indexOf("─── PDF"), src.indexOf("if (loading)"));
    expect(pdf).not.toContain("✓");
    const literals = pdf.match(/"[^"\n]*"|`[^`\n]*`/g) ?? [];
    for (const l of literals) expect(isPdfSafe(l), l).toBe(true);
  });
  it("status column says Paid", () => expect(statusLabel({ ...base, payment_status: "paid" })).toBe("Paid"));
});

describe("lodge display", () => {
  const hosts = ["Weybridge Lodge No. 6787", "Astolat Lodge No. 5848"];
  it("full names show as stored", () => expect(lodgeDisplay("Astolat Lodge No. 5848", hosts)).toBe("Astolat Lodge No. 5848"));
  it("legacy short value matches the hosting lodge", () => expect(lodgeDisplay("Weybridge", hosts)).toBe("Weybridge Lodge No. 6787"));
  it("legacy short value matches the owning lodge when no hosts", () => expect(lodgeDisplay("Weybridge", [], "Weybridge Lodge No. 6787")).toBe("Weybridge Lodge No. 6787"));
  it("Guest and Other", () => {
    expect(lodgeDisplay("Guest", hosts)).toBe("Guest / not a Freemason");
    expect(lodgeDisplay("Other", hosts)).toBe("Another lodge");
  });
  it("unmatched shows exactly as stored", () => expect(lodgeDisplay("Some Lodge 99", hosts)).toBe("Some Lodge 99"));
});

describe("guest requests", () => {
  it("empty or missing (old page) stores nothing", () => {
    expect(parseGuestRequests(undefined)).toEqual({ value: null });
    expect(parseGuestRequests("   ")).toEqual({ value: null });
  });
  it("300 ok, 301 rejected", () => {
    expect(parseGuestRequests("a".repeat(300)).value).toHaveLength(300);
    expect(parseGuestRequests("a".repeat(301)).error).toMatch(/300 characters/);
  });
  it("strips control characters and collapses blank lines", () => {
    expect(cleanGuestRequests("Fred\u0000 and\u0007 Jill\r\n\r\n\r\n\r\nthanks\u200B")).toBe("Fred and Jill\n\nthanks");
  });
  it("form shows the error under the box", () => {
    const errs = validateEventForm({ name: "A", email: "a@b.co", phone: "01234 567890", adultRows: [{ name: "A" }], childRows: [], guestRequests: "x".repeat(301) });
    expect(errs.map((e) => e.id)).toEqual(["pev-requests"]);
  });
  it("PDF preview truncates to 120", () => expect(guestRequestsPreview("x".repeat(200))).toHaveLength(120));
  it("server never puts requests in Stripe metadata", () => {
    const src = readFileSync("supabase/functions/create-event-checkout/index.ts", "utf8");
    const meta = src.slice(src.indexOf("const metadata"), src.indexOf("const metadata") + 400);
    expect(meta).not.toMatch(/guest_requests|guestRequests/);
  });
  it("duplicating an event never copies requests", () => {
    const p = buildDuplicatePayload({ name: "X 2026", event_date: "2026-12-19", guest_requests: "seat us" }, []);
    expect(p).not.toHaveProperty("guest_requests");
  });
});
