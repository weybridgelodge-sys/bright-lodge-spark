import { describe, expect, it } from "vitest";
import { priceOrder, type OrderConfig } from "@/lib/eventOrder";
import { eventActuals } from "@/lib/treasurer/eventTieOut";

const A = "00000000-0000-0000-0000-00000000000a";
const base: OrderConfig = {
  event_type: "dinner_festival", modules: { courses: true, kids_menu: true, catalogue: true }, fee_cover_enabled: true,
  adult_price_pence: 7500, child_price_pence: 3000,
  courses: [{ id: "c1", menu_set: "adult", name: "Main" }, { id: "k1", menu_set: "child", name: "Kids main" }],
  options: [{ id: "o1", course_id: "c1", label: "Beef", active: true }, { id: "o2", course_id: "c1", label: "Old", active: false },
    { id: "ko", course_id: "k1", label: "Pasta", active: true }],
  items: [{ id: A, name: "Wine", price_pence: 2500, kind: "drink", active: true, max_per_booking: 3 },
    { id: "off", name: "Gone", price_pence: 100, kind: "drink", active: false, max_per_booking: null }],
};
const adult = { is_child: false, courses: [{ course_id: "c1", option_id: "o1" }] };
const req = { adults: 1, children: 0, guests: [adult], method: "card" as const, coverFee: false };

describe("priceOrder", () => {
  it("prices tickets plus drinks from database rows", () => {
    const r = priceOrder(base, { ...req, items: [{ item_id: A, qty: 2 }] });
    expect(r.ok && r.order.subtotalPence).toBe(12500);
    expect(r.ok && r.order.itemsPence).toBe(5000);
  });
  it("rejects inactive items and over max_per_booking", () => {
    expect(priceOrder(base, { ...req, items: [{ item_id: "off", qty: 1 }] }).ok).toBe(false);
    expect(priceOrder(base, { ...req, items: [{ item_id: A, qty: 4 }] }).ok).toBe(false);
  });
  it("rejects inactive or missing course choice", () => {
    expect(priceOrder(base, { ...req, guests: [{ is_child: false, courses: [{ course_id: "c1", option_id: "o2" }] }] }).ok).toBe(false);
    expect(priceOrder(base, { ...req, guests: [{ is_child: false, courses: [] }] }).ok).toBe(false);
  });
  it("children must use the kids' menu when it is on", () => {
    const g = { is_child: true, courses: [{ course_id: "c1", option_id: "o1" }] };
    expect(priceOrder(base, { ...req, adults: 0, children: 1, guests: [g] }).ok).toBe(false);
  });
  it("decide later only when enabled", () => {
    const g = { is_child: false, courses: [{ course_id: "c1", option_id: null, decide_later: true }] };
    expect(priceOrder(base, { ...req, guests: [g] }).ok).toBe(false);
    const r = priceOrder({ ...base, modules: { ...(base.modules as object), courses_decide_later: true } }, { ...req, guests: [g] });
    expect(r.ok && r.order.menuSummaries[0]).toBe("(decide later: Main)");
  });
  it("fee only when the event allows it", () => {
    expect((priceOrder(base, { ...req, coverFee: true }) as any).order.feePence).toBe(170);
    expect((priceOrder({ ...base, fee_cover_enabled: false }, { ...req, coverFee: true }) as any).order.feePence).toBe(0);
  });
  it("simple events ignore modules and reject extras", () => {
    const simple = { ...base, event_type: "simple" };
    const r = priceOrder(simple, { ...req, guests: [{ is_child: false }] });
    expect(r.ok && r.order.subtotalPence).toBe(7500);
    expect(priceOrder(simple, { ...req, guests: [{ is_child: false }], items: [{ item_id: A, qty: 1 }] }).ok).toBe(false);
  });
});

describe("Pre-orders actual", () => {
  it("splits drinks out of ticket sales", () => {
    const a = eventActuals([{ payment_status: "paid", payment_method: "card", subtotal_pence: 12500, items_subtotal_pence: 5000 }]);
    expect(a.ticketSales).toBe(7500);
    expect(a.preOrders).toBe(5000);
  });
});
