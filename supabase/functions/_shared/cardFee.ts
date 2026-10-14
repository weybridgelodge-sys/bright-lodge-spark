// Single source of the optional card-fee rule for public event bookings.
// Mirrors the lodge rule (Bookings.tsx calcCardFeePence / create-checkout calcFeePence):
// 2% of the subtotal rounded up, plus a flat 20p; zero for a zero subtotal.
// Plain TypeScript with no runtime imports so both the website and backend functions use it.
export type EventPayMethod = "card" | "pay_by_bank" | "bank_transfer";

export function calcCardFeePence(subtotalPence: number): number {
  return subtotalPence > 0 ? Math.ceil(subtotalPence * 0.02) + 20 : 0;
}

/** Fee actually charged: card payments only, and only when the booker chose to cover it. */
export function eventFeePence(subtotalPence: number, method: EventPayMethod, coverFee: boolean): number {
  return method === "card" && coverFee ? calcCardFeePence(subtotalPence) : 0;
}
