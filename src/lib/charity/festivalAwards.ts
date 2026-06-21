// Award tiers for Provincial Festivals.
// Gold is reached at the standard target.
// Platinum is reached at a separately-set higher absolute target (set by Province).
export type FestivalAwardTier = { name: string; threshold: number };

export function highestAwardAchieved(
  cumulative: number,
  goldTarget: number,
  platinumTarget: number | null | undefined,
): FestivalAwardTier | null {
  if (cumulative <= 0) return null;
  const tiers: FestivalAwardTier[] = [];
  if (goldTarget > 0) tiers.push({ name: "Gold", threshold: goldTarget });
  if (platinumTarget && platinumTarget > 0) tiers.push({ name: "Platinum", threshold: platinumTarget });
  tiers.sort((a, b) => a.threshold - b.threshold);
  let achieved: FestivalAwardTier | null = null;
  for (const t of tiers) {
    if (cumulative >= t.threshold) achieved = t;
  }
  return achieved;
}
