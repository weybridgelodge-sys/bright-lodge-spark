import { describe, it, expect } from "vitest";
import { parseModules, poundsToPence, contentImagePath, remapImagePath, paymentScheduleErrors, effectiveDepositPercent, ONE_THIRD_STORED } from "@/lib/eventModules";
import { buildDuplicatePayload } from "@/lib/eventDuplicate";
import { depositPence } from "@/lib/eventPricing";
import { hidesScrollToTop } from "@/components/ScrollToTopButton";

describe("event modules", () => {
  it("simple events have every module off even if flags are stored", () => {
    const m = parseModules({ courses: true, catalogue: true, deposit: true, info_blocks: true }, "simple");
    expect([m.courses, m.catalogue, m.deposit, m.info_blocks]).toEqual([false, false, false, false]);
  });
  it("unknown or missing flags are off; kids menu needs courses", () => {
    expect(parseModules(null).courses).toBe(false);
    expect(parseModules({ kids_menu: true }).kids_menu).toBe(false);
    expect(parseModules({ courses: true, kids_menu: true }).kids_menu).toBe(true);
    expect(parseModules({ courses: "yes" }).courses).toBe(false);
  });
  it("pounds to pence", () => {
    expect(poundsToPence("24.50")).toBe(2450);
    expect(poundsToPence("£10")).toBe(1000);
    expect(poundsToPence("")).toBeNull();
    expect(poundsToPence("1.234")).toBeNull();
  });
  it("one third preset deposits exactly a third, rounded up", () => {
    expect(effectiveDepositPercent(ONE_THIRD_STORED)).toBeCloseTo(100 / 3, 10);
    expect(depositPence(30000, effectiveDepositPercent(ONE_THIRD_STORED))).toBe(10000);
    expect(depositPence(10000, effectiveDepositPercent(ONE_THIRD_STORED))).toBe(3334);
    expect(effectiveDepositPercent(25)).toBe(25);
  });
  it("deposit schedule needs percent and due date on or before the event", () => {
    const base = { payment_mode: "full_or_deposit" as const, event_date: "2027-08-14" };
    expect(paymentScheduleErrors({ ...base, deposit_percent: null, balance_due_date: "2027-07-01" }).length).toBe(1);
    expect(paymentScheduleErrors({ ...base, deposit_percent: 25, balance_due_date: null }).length).toBe(1);
    expect(paymentScheduleErrors({ ...base, deposit_percent: 25, balance_due_date: "2027-09-01" }).length).toBe(1);
    expect(paymentScheduleErrors({ ...base, deposit_percent: 25, balance_due_date: "2027-07-01" })).toEqual([]);
    expect(paymentScheduleErrors({ payment_mode: "full", deposit_percent: null, balance_due_date: null, event_date: "2027-08-14" })).toEqual([]);
  });
  it("image paths stay inside the event folder and reject other types", () => {
    expect(contentImagePath("ev1", "Hotel.JPG", "abc")).toBe("ev1/abc.jpg");
    expect(() => contentImagePath("ev1", "x.gif")).toThrow();
    expect(remapImagePath("ev1/abc.jpg", "ev2")).toBe("ev2/abc.jpg");
  });
  it("back-to-top hides on event pages only", () => {
    expect(hidesScrollToTop("/events/christmas-party-2026")).toBe(true);
    expect(hidesScrollToTop("/events/christmas-party-2026/confirmation")).toBe(true);
    expect(hidesScrollToTop("/events")).toBe(false);
    expect(hidesScrollToTop("/")).toBe(false);
  });
});

describe("duplicate copies module settings", () => {
  const fest = {
    id: "f", name: "Ladies Festival 2026", public_title: "Ladies Festival 2026", slug: "ladies-festival-2026", event_date: "2026-08-15",
    event_type: "dinner_festival", modules: { courses: true, catalogue: true }, payment_mode: "full_or_deposit", deposit_percent: 33.333,
    balance_due_date: "2026-07-15", fee_cover_enabled: false, seo_title: "Ladies Festival 2026 | Weybridge", seo_description: "Gala",
    og_image_url: "storage:f/a.jpg", balance_token: "secret", amount_paid_pence: 5000, is_public: true,
  };
  it("copies type, modules, schedule, fee and SEO; rolls balance date and SEO year", () => {
    const p = buildDuplicatePayload(fest, []);
    expect(p.event_type).toBe("dinner_festival");
    expect(p.modules).toEqual({ courses: true, catalogue: true });
    expect(p.payment_mode).toBe("full_or_deposit");
    expect(p.deposit_percent).toBe(33.333);
    expect(p.fee_cover_enabled).toBe(false);
    expect(p.balance_due_date).toBe("2027-07-15");
    expect(p.seo_title).toBe("Ladies Festival 2027 | Weybridge");
    expect(p.og_image_url).toBe("storage:f/a.jpg");
  });
  it("never copies tokens, payments or publish state", () => {
    const p = buildDuplicatePayload(fest, []);
    expect(p).not.toHaveProperty("balance_token");
    expect(p).not.toHaveProperty("amount_paid_pence");
    expect(p.is_public).toBe(false);
  });
  it("null balance date stays null", () => expect(buildDuplicatePayload({ ...fest, balance_due_date: null }, []).balance_due_date).toBeNull());
});
