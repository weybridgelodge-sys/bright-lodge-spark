// Pure split of one member's subscription into ledger credits.
// Full rate £250 → £211 to 4000, £10/£9/£10 to 3100 (tagged per pot), £10 to 2200.
// Under-25 halves every pot and the Relief Chest share; 4000 takes the remainder.

export type SplitPot = { fund_code: string; label: string; annual_pence: number };
export type SplitLine = {
  code: "4000" | "3100" | "2200";
  fund_code: string | null;
  label: string;
  pence: number;
};

export const RETIRED_POTS = new Set(["MASTERS_FUND"]);

export function splitSubscription(
  amountPence: number,
  under25: boolean,
  pots: SplitPot[],
  reliefChestPence: number,
): SplitLine[] {
  const half = (p: number) => (under25 ? Math.round(p / 2) : p);
  const potLines: SplitLine[] = pots
    .filter((p) => !RETIRED_POTS.has(p.fund_code))
    .map((p) => ({ code: "3100", fund_code: p.fund_code, label: p.label, pence: half(p.annual_pence) }));
  const relief: SplitLine = { code: "2200", fund_code: null, label: "Relief Chest", pence: half(reliefChestPence) };
  const used = potLines.reduce((s, l) => s + l.pence, 0) + relief.pence;
  const income: SplitLine = { code: "4000", fund_code: null, label: "Subscription", pence: amountPence - used };
  if (income.pence < 0) throw new Error("Subscription is smaller than its reserve and Relief Chest shares");
  return [income, ...potLines, relief];
}
