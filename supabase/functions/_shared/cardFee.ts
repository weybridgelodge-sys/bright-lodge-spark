// Single source of the optional processing-fee contribution rules for public event bookings.
// Card mirrors the lodge rule (Bookings.tsx calcCardFeePence / create-checkout calcFeePence).
// Each rule = Stripe's events-account rate plus the lodge's usual margin; zero for a zero subtotal.
// Plain TypeScript with no runtime imports so both the website and backend functions use it.
export type EventPayMethod = "card" | "pay_by_bank" | "bank_transfer";

/** Card: 2% rounded up + 20p. */
export function calcCardFeePence(subtotalPence: number): number {
  return subtotalPence > 0 ? Math.ceil(subtotalPence * 0.02) + 20 : 0;
}

/** Contribution offered for a method, before the booker's Yes/No choice. */
export function calcProcessingFeePence(subtotalPence: number, method: EventPayMethod): number {
  if (subtotalPence <= 0) return 0;
  if (method === "card") return calcCardFeePence(subtotalPence);
  if (method === "pay_by_bank") return Math.ceil(subtotalPence * 0.01) + 20; // 1% + 20p
  return Math.ceil(subtotalPence * 0.01); // bank transfer: 1%
}

/** Fee actually charged: only when the booker chose to cover it. */
export function eventFeePence(subtotalPence: number, method: EventPayMethod, coverFee: boolean): number {
  return coverFee ? calcProcessingFeePence(subtotalPence, method) : 0;
}

export const feeQuestion = (method: EventPayMethod) =>
  method === "card" ? "Cover the Stripe card processing fee?" : "Cover the bank payment processing fee?";

export const feeLineItemName = (method: EventPayMethod) =>
  method === "card" ? "Card processing fee" : "Bank payment processing fee";
