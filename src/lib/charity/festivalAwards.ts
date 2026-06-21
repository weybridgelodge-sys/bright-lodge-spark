// Award tiers for Provincial Festivals.
// Each tier has its own target. The highest tier whose threshold is met by the
// contribution to date wins. Bronze < Silver < Gold < Platinum.
export type FestivalAwardTier = { name: "Bronze" | "Silver" | "Gold" | "Platinum"; threshold: number };

export type FestivalTargets = {
  bronze?: number | null;
  silver?: number | null;
  gold?: number | null;
  platinum?: number | null;
};

export function festivalTiers(targets: FestivalTargets): FestivalAwardTier[] {
  const tiers: FestivalAwardTier[] = [];
  if (targets.bronze && targets.bronze > 0) tiers.push({ name: "Bronze", threshold: Number(targets.bronze) });
  if (targets.silver && targets.silver > 0) tiers.push({ name: "Silver", threshold: Number(targets.silver) });
  if (targets.gold && targets.gold > 0) tiers.push({ name: "Gold", threshold: Number(targets.gold) });
  if (targets.platinum && targets.platinum > 0) tiers.push({ name: "Platinum", threshold: Number(targets.platinum) });
  tiers.sort((a, b) => a.threshold - b.threshold);
  return tiers;
}

export function highestAwardAchieved(
  cumulative: number,
  targetsOrGold: FestivalTargets | number,
  platinumTarget?: number | null,
): FestivalAwardTier | null {
  if (cumulative <= 0) return null;
  const targets: FestivalTargets = typeof targetsOrGold === "number"
    ? { gold: targetsOrGold, platinum: platinumTarget ?? null }
    : targetsOrGold;
  const tiers = festivalTiers(targets);
  let achieved: FestivalAwardTier | null = null;
  for (const t of tiers) {
    if (cumulative >= t.threshold) achieved = t;
  }
  return achieved;
}

export function nextTierAhead(
  cumulative: number,
  targets: FestivalTargets,
): FestivalAwardTier | null {
  const tiers = festivalTiers(targets);
  for (const t of tiers) {
    if (cumulative < t.threshold) return t;
  }
  return null;
}
