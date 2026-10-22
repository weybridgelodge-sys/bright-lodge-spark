// One officer resolver for every roll: Summons, UGLE and Provincial returns.
// Ladder offices follow the Progression Ladder (saved row, else computed);
// all other offices use "latest confirmed appointment, presumed continuing"
// (with the Almoner exception). Pure — callers pass the rows they loaded.
import {
  resolveContinuingOffice, resolveLadderOffice,
  type ApptRow, type ProfileLite, type StatusRow, type ResolvedOffice,
} from "@/lib/installationReturn";
import type { PositionKey } from "@/lib/officersProgression";

export const LADDER_KEYS = new Set<string>([
  "worshipful_master", "senior_warden", "junior_warden", "senior_deacon", "junior_deacon",
  "inner_guard", "senior_steward", "steward_1", "steward_2", "steward_3", "steward_4", "steward_5",
]);

export type RollInput = { year: number; appts: ApptRow[]; profiles: ProfileLite[]; statuses: StatusRow[] };

export function resolveRollOffice(key: string, label: string, input: RollInput): ResolvedOffice {
  return LADDER_KEYS.has(key)
    ? resolveLadderOffice(key as PositionKey, label, input)
    : resolveContinuingOffice(key, label, input.year, input.appts);
}

/** Resolve many offices with a per-call cache (ladder projection is computed once per key). */
export function resolveOfficeRoll(offices: { key: string; label: string }[], input: RollInput): ResolvedOffice[] {
  const cache = new Map<string, ResolvedOffice>();
  return offices.map(({ key, label }) => {
    if (!cache.has(key)) cache.set(key, resolveRollOffice(key, label, input));
    return { ...cache.get(key)!, label };
  });
}

/** Short on-screen wording for where a name came from. Never printed on the summons. */
export function provenanceLabel(o: Pick<ResolvedOffice, "provenance" | "fromYear">): string {
  switch (o.provenance) {
    case "confirmed": return "Confirmed";
    case "carried": return o.fromYear ? `Carried forward from ${o.fromYear}` : "Carried forward";
    case "planned": return "Planned (Progression Ladder)";
    case "computed": return "Planned (Progression Ladder, not saved)";
    default: return "Vacant";
  }
}
