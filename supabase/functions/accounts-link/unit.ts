// Lodge for an accounts link (JOB CJ). The link has no signed-in caller, and
// treasurer_year_approvals has no unit column, so the lodge is the submitting
// member's own profile unit (via the shared callerUnit helper). Blank = refuse.
import { loadCallerUnit, noCallerUnitMessage } from "../_shared/callerUnit.ts";

// deno-lint-ignore no-explicit-any
export async function accountsLinkUnit(db: any, submittedBy: unknown): Promise<{ ok: true; unitId: string } | { ok: false; message: string }> {
  const id = typeof submittedBy === "string" ? submittedBy : "";
  const unitId = id ? await loadCallerUnit(db, id) : "";
  return unitId ? { ok: true, unitId } : { ok: false, message: noCallerUnitMessage("open these accounts").replace("Your member record", "The submitting member's record") };
}
