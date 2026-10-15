// Pure server-authoritative pricing for event bookings with optional modules
// (per-guest courses, drinks/voucher catalogue). Shared by browser and backend.
// Simple events (no modules) produce exactly the same tickets/fee as before.
import { eventFeePence, type EventPayMethod } from "./cardFee.ts";
import { quoteBooking } from "./eventPricing.ts";

export type OrderModules = { courses: boolean; kids_menu: boolean; catalogue: boolean; decide_later: boolean };

/** Module switches as stored; unknown/missing are off and simple events are always all-off. */
export function orderModules(raw: unknown, eventType: string | null | undefined): OrderModules {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const on = (v: unknown) => eventType !== "simple" && v === true;
  const courses = on(o.courses);
  return { courses, kids_menu: courses && on(o.kids_menu), catalogue: on(o.catalogue), decide_later: courses && on(o.courses_decide_later) };
}

export type CourseRow = { id: string; menu_set: "adult" | "child"; name: string; sort_order?: number };
export type OptionRow = { id: string; course_id: string; label: string; active: boolean };
export type ItemRow = {
  id: string; name: string; price_pence: number; kind: "drink" | "voucher"; active: boolean;
  max_per_booking: number | null; unit_note?: string | null; category_name?: string | null;
};

export type OrderConfig = {
  event_type: string | null; modules: unknown; fee_cover_enabled: boolean;
  adult_price_pence: number; child_price_pence: number;
  courses: CourseRow[]; options: OptionRow[]; items: ItemRow[];
};

export type GuestCourseInput = { course_id: string; option_id: string | null; decide_later?: boolean };
export type OrderRequest = {
  adults: number; children: number;
  guests: { is_child: boolean; courses?: GuestCourseInput[] }[];
  items?: { item_id: string; qty: number }[];
  method: EventPayMethod; coverFee: boolean;
};

export type PricedChoice = { course_id: string; option_id: string | null; course_name: string; option_label: string | null; decide_later: boolean };
export type PricedItem = ItemRow & { qty: number; line_pence: number };
export type PricedOrder = {
  ticketsPence: number; itemsPence: number; subtotalPence: number; feePence: number; totalPence: number;
  coverFee: boolean; guestChoices: PricedChoice[][]; items: PricedItem[]; menuSummaries: (string | null)[];
};

const sortCourses = (a: CourseRow, b: CourseRow) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

/** Courses a guest must answer: adults get adult courses; children get the kids' set when it's on. */
export function coursesForGuest(cfg: Pick<OrderConfig, "courses">, mods: OrderModules, isChild: boolean): CourseRow[] {
  if (!mods.courses) return [];
  const set = isChild && mods.kids_menu ? "child" : "adult";
  return cfg.courses.filter((c) => c.menu_set === set).sort(sortCourses);
}

/** Readable summary kept on event_guests.menu_choice. */
export function menuSummary(choices: PricedChoice[]): string | null {
  if (!choices.length) return null;
  const made = choices.filter((c) => !c.decide_later).map((c) => `${c.course_name}: ${c.option_label}`);
  const later = choices.filter((c) => c.decide_later).map((c) => c.course_name);
  return [made.join("; "), later.length ? `(decide later: ${later.join(", ")})` : ""].filter(Boolean).join(" ");
}

/** Recalculates the whole order from database rows; any client price/label is ignored. */
export function priceOrder(cfg: OrderConfig, req: OrderRequest): { ok: true; order: PricedOrder } | { ok: false; error: string } {
  const mods = orderModules(cfg.modules, cfg.event_type);
  const optionById = new Map(cfg.options.map((o) => [o.id, o]));

  const guestChoices: PricedChoice[][] = [];
  for (const g of req.guests) {
    const needed = coursesForGuest(cfg, mods, g.is_child);
    const given = g.courses ?? [];
    if (!mods.courses) {
      if (given.length) return { ok: false, error: "Menu choices are not taken for this event." };
      guestChoices.push([]);
      continue;
    }
    if (given.length !== needed.length || new Set(given.map((c) => c.course_id)).size !== given.length) {
      return { ok: false, error: "Please choose a dish for every course for each guest." };
    }
    const out: PricedChoice[] = [];
    for (const course of needed) {
      const c = given.find((x) => x.course_id === course.id);
      if (!c) return { ok: false, error: "Please choose a dish for every course for each guest." };
      if (c.decide_later) {
        if (!mods.decide_later) return { ok: false, error: "Please choose a dish for every course for each guest." };
        out.push({ course_id: course.id, option_id: null, course_name: course.name, option_label: null, decide_later: true });
        continue;
      }
      const opt = c.option_id ? optionById.get(c.option_id) : undefined;
      if (!opt || opt.course_id !== course.id || !opt.active) return { ok: false, error: "One of the menu choices is no longer available. Please choose again." };
      out.push({ course_id: course.id, option_id: opt.id, course_name: course.name, option_label: opt.label, decide_later: false });
    }
    guestChoices.push(out);
  }

  const items: PricedItem[] = [];
  const reqItems = (req.items ?? []).filter((i) => i.qty !== 0);
  if (reqItems.length && !mods.catalogue) return { ok: false, error: "Pre-orders are not taken for this event." };
  const seen = new Set<string>();
  for (const ri of reqItems) {
    if (!Number.isInteger(ri.qty) || ri.qty < 0) return { ok: false, error: "Please check your pre-order quantities." };
    if (seen.has(ri.item_id)) return { ok: false, error: "Please check your pre-order quantities." };
    seen.add(ri.item_id);
    const it = cfg.items.find((x) => x.id === ri.item_id);
    if (!it || !it.active) return { ok: false, error: "One of the pre-order items is no longer available." };
    if (it.max_per_booking != null && ri.qty > it.max_per_booking) return { ok: false, error: `You can order up to ${it.max_per_booking} of ${it.name}.` };
    items.push({ ...it, qty: ri.qty, line_pence: it.price_pence * ri.qty });
  }

  const ticketsPence = Math.max(0, req.adults) * cfg.adult_price_pence + Math.max(0, req.children) * cfg.child_price_pence;
  const itemsPence = items.reduce((s, i) => s + i.line_pence, 0);
  const coverFee = cfg.fee_cover_enabled !== false && req.coverFee;
  const q = quoteBooking({ orderPence: ticketsPence + itemsPence, plan: "full", method: req.method, coverFee });
  return {
    ok: true,
    order: {
      ticketsPence, itemsPence, subtotalPence: q.chargePence, feePence: q.feePence, totalPence: q.totalNowPence, coverFee,
      guestChoices, items, menuSummaries: guestChoices.map(menuSummary),
    },
  };
}

export { eventFeePence };
