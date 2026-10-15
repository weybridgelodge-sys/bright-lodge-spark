import { describe, expect, it } from "vitest";
import { priceOrder, stripeLines } from "@/lib/eventOrder";
import { feeLineItemName } from "../../supabase/functions/_shared/cardFee";
import { orderTotalPence, quoteBooking } from "@/lib/eventPricing";

// Verbatim copy of the pre-Stage-3 (9d864083) create-event-checkout line_items and pricing,
// kept as the baseline that simple events must reproduce byte-for-byte.
function baseline(input: { adults: number; children: number; payment_method: "card" | "pay_by_bank" | "bank_transfer"; cover_fee: boolean }, ev: { adult_price_pence: number; child_price_pence: number }, stripeName: string) {
  const q = quoteBooking({ orderPence: orderTotalPence(input.adults, input.children, ev.adult_price_pence, ev.child_price_pence), plan: "full", method: input.payment_method, coverFee: input.cover_fee });
  const fee = q.feePence;
  return {
    subtotal: q.chargePence, fee, total: q.totalNowPence,
    lines: [
      ...(input.adults ? [{ quantity: input.adults, price_data: { currency: "gbp", unit_amount: ev.adult_price_pence, product_data: { name: `${stripeName} — adult` } } }] : []),
      ...(input.children ? [{ quantity: input.children, price_data: { currency: "gbp", unit_amount: ev.child_price_pence, product_data: { name: `${stripeName} — child (12 and under)` } } }] : []),
      ...(fee > 0 ? [{ quantity: 1, price_data: { currency: "gbp", unit_amount: fee, product_data: { name: feeLineItemName(input.payment_method) } } }] : []),
    ],
  };
}

const ev = { adult_price_pence: 3500, child_price_pence: 0 };
const name = "Joint Christmas Party 2026";

describe("simple event checkout matches the pre-Stage-3 baseline", () => {
  for (const method of ["card", "pay_by_bank", "bank_transfer"] as const) {
    for (const cover of [true, false]) {
      for (const [adults, children] of [[1, 0], [2, 0], [2, 3], [0, 1]]) {
        it(`${method} cover=${cover} ${adults}A/${children}C`, () => {
          const old = baseline({ adults, children, payment_method: method, cover_fee: cover }, ev, name);
          const r = priceOrder({ event_type: "simple", modules: {}, fee_cover_enabled: true, ...ev, courses: [], options: [], items: [] },
            { adults, children, guests: [], method, coverFee: cover });
          if (r.ok === false) throw new Error(r.error);
          expect([r.order.subtotalPence, r.order.feePence, r.order.totalPence]).toEqual([old.subtotal, old.fee, old.total]);
          const now = stripeLines({ stripeName: name, adults, children, adultPence: ev.adult_price_pence, childPence: ev.child_price_pence, items: r.order.items, feePence: r.order.feePence, feeName: feeLineItemName(method) });
          expect(JSON.stringify(now)).toBe(JSON.stringify(old.lines));
        });
      }
    }
  }

  it("pre-order items get their own line between tickets and fee", () => {
    const lines = stripeLines({ stripeName: "Festival", adults: 2, children: 0, adultPence: 7500, childPence: 0, items: [{ name: "Prosecco", qty: 3, price_pence: 2800 }], feePence: 380, feeName: "Card processing fee" });
    expect(lines.map((l) => [l.quantity, l.price_data.unit_amount, l.price_data.product_data.name])).toEqual([
      [2, 7500, "Festival — adult"], [3, 2800, "Festival — Prosecco"], [1, 380, "Card processing fee"],
    ]);
  });
});
