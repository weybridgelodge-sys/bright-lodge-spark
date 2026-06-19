// Award tiers for Provincial Festivals.
// Future-proofed: add new tiers here as Province announces them
// (e.g. Platinum at 150% of target). Highest achieved tier wins.
export type FestivalAwardTier = { name: string; ratio: number };

export const FESTIVAL_AWARD_TIERS: FestivalAwardTier[] = [
  { name: "Gold", ratio: 1.0 },
  // Placeholder — Platinum threshold to be confirmed by Province.
  { name: "Platinum", ratio: 1.5 },
];

export function highestAwardAchieved(
  cumulative: number,
  target: number,
  tiers: FestivalAwardTier[] = FESTIVAL_AWARD_TIERS,
): FestivalAwardTier | null {
  if (target <= 0 || cumulative <= 0) return null;
  const ratio = cumulative / target;
  let achieved: FestivalAwardTier | null = null;
  for (const t of tiers) {
    if (ratio >= t.ratio) achieved = t;
  }
  return achieved;
}
