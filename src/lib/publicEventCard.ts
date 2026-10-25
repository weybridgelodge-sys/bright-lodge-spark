// Presentation helper for the featured "book online" cards on the Events page.
import { eventBookingState, seatsLeft, type PublicEvent } from "./publicEvents";

const typeBadge: Record<string, string> = {
  christmas_party: "Christmas Party", christmas: "Christmas Party", ladies_festival: "Ladies Festival",
  dinner: "Dinner", social: "Social Event",
};

export function featuredCardInfo(
  pe: Pick<PublicEvent, "event_type" | "theme" | "adult_price_pence" | "child_price_pence" | "booking_deadline" | "capacity" | "seats_taken" | "event_date">,
  now: Date = new Date(),
) {
  const state = eventBookingState(pe, now);
  const badge = (pe.event_type && typeBadge[pe.event_type]) || (pe.theme === "christmas" ? "Christmas Party" : "Book online");
  const cta = state === "open" ? "Book your places" : state === "sold_out" ? "Sold out" : state === "closed" ? "Booking closed" : "Prices coming soon";
  const left = seatsLeft(pe);
  const seats = state === "open" && left != null ? `${left} ${left === 1 ? "place" : "places"} remaining` : null;
  return { state, badge, cta, seats };
}

/** Soonest first. */
export const sortBySoonest = <T extends { event_date: string }>(list: T[]) =>
  [...list].sort((a, b) => a.event_date.localeCompare(b.event_date));
