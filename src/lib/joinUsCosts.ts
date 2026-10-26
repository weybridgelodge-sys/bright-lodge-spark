import { supabase } from "@/integrations/supabase/client";
import { resolveSiteUnit } from "@/lib/siteUnit";

/**
 * Public cost figures (Join Us cards and FAQ answer) from get_join_us_costs():
 * subscription_settings annual rate, lodge_fee_settings UGLE fee (25 and over)
 * and the next/latest published meeting dining price. Any missing or invalid
 * figure falls back to the previously typed text.
 */
export const JOIN_US_COST_FALLBACK = {
  ugle: "£132",
  dues: "£250 / year",
  dining: "~£32 per meeting",
} as const;

type Row = { annual_dues_pence?: number | null; dining_price_pence?: number | null; ugle_fee_pence?: number | null } | null | undefined;

const pounds = (p: number) => `£${Number.isInteger(p / 100) ? p / 100 : (p / 100).toFixed(2)}`;
const valid = (p: unknown): p is number => typeof p === "number" && Number.isFinite(p) && p > 0;

export function joinUsCostAmounts(row: Row) {
  return {
    ugle: valid(row?.ugle_fee_pence) ? pounds(row!.ugle_fee_pence!) : JOIN_US_COST_FALLBACK.ugle,
    dues: valid(row?.annual_dues_pence) ? `${pounds(row!.annual_dues_pence!)} / year` : JOIN_US_COST_FALLBACK.dues,
    dining: valid(row?.dining_price_pence) ? `~${pounds(row!.dining_price_pence!)} per meeting` : JOIN_US_COST_FALLBACK.dining,
  };
}

/** FAQ "What does membership cost?" answer; typed figures as fallback. */
export function faqCostAnswer(row: Row) {
  const ugle = valid(row?.ugle_fee_pence) ? pounds(row!.ugle_fee_pence!) : "£132";
  const dues = valid(row?.annual_dues_pence) ? pounds(row!.annual_dues_pence!) : "£250";
  const dining = valid(row?.dining_price_pence) ? pounds(row!.dining_price_pence!) : "£32";
  return `There is a one-off UGLE registration fee of ${ugle} payable on initiation, and an annual subscription of ${dues} which supports Lodge activities and charitable giving. After each meeting, members dine together at the Festive Board — a three-course dinner at approximately ${dining}. Other costs (bar, raffle) are entirely optional. Members under 25 receive a 50% reduction on both the registration fee and annual subscription.`;
}

/** This site's own lodge figures; null (typed fallback) when the site or the call fails. */
export async function fetchJoinUsCostRow(): Promise<Row> {
  const unit = await resolveSiteUnit();
  if (!unit) return null;
  const { data, error } = await supabase.rpc("get_join_us_costs", { _unit: unit });
  if (error) { console.error("get_join_us_costs failed:", error); return null; }
  return (Array.isArray(data) ? data[0] : data) ?? null;
}
