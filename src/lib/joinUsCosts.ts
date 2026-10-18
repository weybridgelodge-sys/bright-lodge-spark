/**
 * Join Us cost card amounts. Lodge figures come from get_join_us_costs()
 * (subscription_settings annual rate, as on the Treasurer New member fees
 * screen + next/latest published meeting dining price); any
 * missing or invalid figure falls back to the previously typed text.
 */
export const JOIN_US_COST_FALLBACK = {
  // No stored source: the Treasurer New member fees screen only has typed
  // defaults (132.00 for 25 and over, 66.00 under 25). Join Us shows the
  // full fee; the card's "50% off for under-25s" badge covers the other band.
  ugle: "£132",
  dues: "£250 / year",
  dining: "~£32 per meeting",
} as const;

type Row = { annual_dues_pence?: number | null; dining_price_pence?: number | null } | null | undefined;

const pounds = (p: number) => `£${Number.isInteger(p / 100) ? p / 100 : (p / 100).toFixed(2)}`;
const valid = (p: unknown): p is number => typeof p === "number" && Number.isFinite(p) && p > 0;

export function joinUsCostAmounts(row: Row) {
  return {
    ugle: JOIN_US_COST_FALLBACK.ugle,
    dues: valid(row?.annual_dues_pence) ? `${pounds(row!.annual_dues_pence!)} / year` : JOIN_US_COST_FALLBACK.dues,
    dining: valid(row?.dining_price_pence) ? `~${pounds(row!.dining_price_pence!)} per meeting` : JOIN_US_COST_FALLBACK.dining,
  };
}
