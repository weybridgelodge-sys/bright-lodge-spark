/** Lodge default fees (lodge_fee_settings via get/update_lodge_fee_settings RPCs). */
export const LODGE_FEE_FALLBACK = { ugle_registration_fee_pence: 13200, pgl_registration_fee_pence: 1512, under_25_discount_percent: 50 } as const;

/** Under-25 figure from the stored discount percent, rounded to the penny. */
export function discountedPence(fullPence: number, discountPercent: number): number {
  const pct = Math.min(100, Math.max(0, discountPercent));
  return Math.round((fullPence * (100 - pct)) / 100);
}

/** Pre-fill value (pounds string) for the one-off fee field. */
export function feeDefault(fullPence: number, under25: boolean, discountPercent: number): string {
  return ((under25 ? discountedPence(fullPence, discountPercent) : fullPence) / 100).toFixed(2);
}

export type FeeValidation = { ugle: number; pgl: number; pct: number } | { error: string };
export function validateFeeInputs(ugle: string, pgl: string, pct: string): FeeValidation {
  const u = Math.round(parseFloat(ugle) * 100), p = Math.round(parseFloat(pgl) * 100), d = Number(pct);
  if (!Number.isFinite(u) || u <= 0) return { error: "UGLE fee must be a positive amount" };
  if (!Number.isFinite(p) || p <= 0) return { error: "PGL fee must be a positive amount" };
  if (pct.trim() === "" || !Number.isInteger(d) || d < 0 || d > 100) return { error: "Discount must be a whole number from 0 to 100" };
  return { ugle: u, pgl: p, pct: d };
}
