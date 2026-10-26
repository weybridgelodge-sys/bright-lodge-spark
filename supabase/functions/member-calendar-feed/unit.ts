// Which lodge a calendar feed is for, and which rows belong to it (JOB CJ).
// The lodge comes only from the token's member (profiles.unit_id).
import { recordUnit } from "../_shared/units.ts";
import type { FeedRows } from "./ics.ts";

export const NO_FEED_UNIT_MESSAGE = "This calendar link belongs to a member record with no lodge set. Ask your Secretary to set your lodge, then subscribe again.";

export function feedUnitFor(profile: { unit_id?: unknown } | null | undefined): { ok: true; unitId: string } | { ok: false; message: string } {
  const u = recordUnit(profile?.unit_id);
  return u ? { ok: true, unitId: u } : { ok: false, message: NO_FEED_UNIT_MESSAGE };
}

/**
 * A row's own unit_id wins (strict match; all feed tables carry unit_id since
 * JOB CL). A row whose unit is still null belongs to the lodge only when exactly ONE lodge exists; otherwise they are
 * left out rather than shown to another lodge's members.
 */
export function scopeRows(r: FeedRows, unitId: string, singleUnit: boolean): FeedRows {
  const keep = (row: any) => {
    const u = recordUnit(row?.unit_id);
    return u ? u === unitId : singleUnit;
  };
  return {
    events: r.events.filter(keep), meetings: r.meetings.filter(keep), socials: r.socials.filter(keep),
    officers: r.officers.filter(keep), loi: r.loi.filter(keep), publicRows: r.publicRows.filter(keep),
    archivedKeys: r.archivedKeys,
  };
}
