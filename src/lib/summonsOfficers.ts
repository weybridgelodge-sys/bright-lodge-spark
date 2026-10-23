// One rule for which officer and representative lines print on the Summons.
// A post prints only when it has a holder (member or typed non-member name).
// Empty posts are left off the print and reported to the builder screen.
import { NON_PROGRESSIVE_LABELS, POSITION_LABELS } from "./officersProgression";

type OfficerLine = { label: string; member?: string | null };
type RepLine = { role?: string | null; name?: string | null };

const LABELS: Record<string, string> = { ...POSITION_LABELS, ...NON_PROGRESSIVE_LABELS };
const KEY_POST_KEYS = ["worshipful_master", "senior_warden", "junior_warden", "secretary", "treasurer"];
export const KEY_POST_LABELS = new Set(KEY_POST_KEYS.map((k) => LABELS[k]).filter(Boolean));

const filled = (s: string | null | undefined) => !!(s ?? "").trim();

/** Officer lines that print, in the original order (duplicates kept). */
export function printableOfficers<T extends OfficerLine>(officers: T[]): T[] {
  return officers.filter((o) => filled(o.member));
}

/** Representative lines that print: only those with a name. */
export function printableReps<T extends RepLine>(reps: T[] | null | undefined): T[] {
  return (reps ?? []).filter((r) => filled(r.name));
}

/** Builder-only summary of posts left off the print. */
export function omittedPosts(officers: OfficerLine[], reps?: RepLine[] | null) {
  const offices = officers.filter((o) => !filled(o.member)).map((o) => o.label);
  const repRoles = (reps ?? []).filter((r) => !filled(r.name) && filled(r.role)).map((r) => (r.role ?? "").trim());
  const all = Array.from(new Set([...offices, ...repRoles]));
  const keyVacant = Array.from(new Set(offices.filter((l) => KEY_POST_LABELS.has(l))));
  return { all, keyVacant };
}
