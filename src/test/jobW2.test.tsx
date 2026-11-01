import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import ts from "typescript";
import MeetingBookingForm from "@/components/bookings/MeetingBookingForm";
import { ResumeCardPayment } from "@/components/payments/ResumeCardPayment";
import { StripeEmbeddedCheckoutPanel } from "@/components/payments/StripeEmbeddedCheckout";
import type { EventBundle } from "@/lib/lodgeEvents";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), options: undefined as any }));
vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) }, functions: { invoke: mocks.invoke } } }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => null }));
vi.mock("@stripe/react-stripe-js", () => ({ EmbeddedCheckoutProvider: ({ options, children }: any) => { mocks.options = options; return children; }, EmbeddedCheckout: () => null }));
vi.mock("@/lib/bookingDetails", () => ({ useBookingDetails: () => ({}), signOff: () => "", lodgePlaceholder: () => "Lodge", paymentReference: () => "Dining" }));
vi.mock("@/components/TurnstileWidget", () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("W-2 meeting card payments", () => {
  it("charges the £35 dining price in the form and checkout", () => {
    const bundle = { event: { title: "December meeting", slug: "december", event_date: "2026-12-16" }, diningOptions: [{ id: "d1", label: "Dining", price_pence: 3500 }] } as EventBundle;
    render(<MemoryRouter><MeetingBookingForm bundle={bundle} publishedMeeting={{ id: "m1", event_key: "december" }} diningOptionId="d1" setDiningOptionId={() => {}} prefill={{ title: "Mr", firstName: "Test", lastName: "Member", email: "test@example.invalid", phone: "07000000000" }} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(document.querySelector("#evf-meeting") as HTMLSelectElement, { target: { value: "meeting-and-festive-board" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("radio", { name: /Debit/ }));
    expect(screen.getAllByText("£35.00")).toHaveLength(2);
    expect(screen.queryByRole("radiogroup", { name: /fee/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continue to Payment" }));
    expect(screen.getByRole("heading", { name: "Secure Card Payment" })).toBeInTheDocument();
    expect(screen.getByText("£35.00")).toBeInTheDocument();
  });

  it.each([undefined, true, false])("omits undefined fee preference but preserves event preference %s", async (cover_fee) => {
    mocks.invoke.mockResolvedValue({ data: { clientSecret: "test-secret" }, error: null });
    render(<StripeEmbeddedCheckoutPanel event_key="event" event_label="Event" contact_name="Guest" contact_email="guest@example.invalid" line_items={[]} return_url="https://example.invalid/return" cover_fee={cover_fee} />);
    await mocks.options.fetchClientSecret();
    const body = mocks.invoke.mock.calls[0][1].body;
    if (cover_fee === undefined) expect(body).not.toHaveProperty("cover_fee");
    else expect(body.cover_fee).toBe(cover_fee);
  });

  it("displays a stored £35.90 pending total without recalculating its fee", () => {
    render(<ResumeCardPayment bookingId="b1" totalPence={3590} holdUntil="2026-12-16T22:00:00Z" title="December meeting" />);
    expect(screen.getByText(/Card payment of £35.90/)).toBeInTheDocument();
  });
});

// Execute the actual edge handler with isolated I/O: no live data or Stripe sessions.
async function checkout(meeting: { id: string; status: string; unit_id: string } | null, subtotal: number, coverFee: boolean) {
  let handler: (req: Request) => Promise<Response> = async () => new Response();
  let stored: any;
  let stripeRequest: any;
  const query: any = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: meeting }), insert: (row: any) => { stored = row; return query; }, single: async () => ({ data: { id: "booking-test" } }), update: () => query };
  const client = { from: () => query, rpc: async () => ({ data: "confirmed", error: null }) };
  const source = readFileSync("supabase/functions/create-checkout/index.ts", "utf8").replace(/^import .*;\n/gm, "");
  const js = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None });
  const { z } = await import("zod");
  const bindings = { Deno: { env: { get: () => "test-only" }, serve: (fn: typeof handler) => { handler = fn; } }, createClient: () => client, corsHeaders: {}, z,
    createStripeClient: () => ({ checkout: { sessions: { create: async (req: any) => { stripeRequest = req; return { id: "session-test", client_secret: "test-secret" }; } } } }),
    seatCheckOutcome: () => ({ ok: true, status: "confirmed" }), findExistingBooking: async () => null, duplicateBookingMessage: () => "duplicate", loadLodgeSettings: async () => ({}), cleanSpaces: (v: string) => v.trim(), trimBookingNames: (v: unknown) => v, holdExpiresAtUnix: () => 123, resolveUnit: async () => "unit-test", unitFor: async () => ({ ok: true, unitId: "unit-test" }), PHONE_REQUIRED_MESSAGE: "Phone required", isPlausiblePhone: () => true };
  new Function(...Object.keys(bindings), js)(...Object.values(bindings));
  const response = await handler(new Request("https://example.invalid", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_key: "test", event_label: "Test", contact_name: "Guest", contact_email: "guest@example.invalid", contact_phone: "07000000000", line_items: [{ label: "Dining", qty: 1, unit_price_pence: subtotal }], cover_fee: coverFee, return_url: "https://example.invalid/return" }) }));
  expect(response.status).toBe(200);
  return { stored, stripeRequest };
}

describe("W-2 actual create-checkout handler", () => {
  it("ignores cover_fee true for a resolved published meeting", async () => {
    const { stored, stripeRequest } = await checkout({ id: "meeting-test", status: "published", unit_id: "unit-test" }, 3500, true);
    expect(stored).toMatchObject({ meeting_id: "meeting-test", subtotal_pence: 3500, fee_pence: 0, total_pence: 3500 });
    expect(stripeRequest.line_items).toHaveLength(1);
    expect(stripeRequest.line_items[0].price_data).toMatchObject({ unit_amount: 3500, product_data: { name: "Dining" } });
  });
  it.each([[3500, 90], [3501, 91], [4250, 105]])("keeps event surcharge for %ip subtotal at %ip", async (subtotal, fee) => {
    const { stored, stripeRequest } = await checkout(null, subtotal, true);
    expect(stored).toMatchObject({ meeting_id: null, subtotal_pence: subtotal, fee_pence: fee, total_pence: subtotal + fee });
    expect(stripeRequest.line_items).toHaveLength(2);
    expect(stripeRequest.line_items[1].price_data).toMatchObject({ unit_amount: fee, product_data: { name: "Card processing fee" } });
  });
  it("keeps event opt-out fee zero", async () => {
    const { stored, stripeRequest } = await checkout(null, 3500, false);
    expect(stored.fee_pence).toBe(0);
    expect(stored.total_pence).toBe(3500);
    expect(stripeRequest.line_items).toHaveLength(1);
  });
});