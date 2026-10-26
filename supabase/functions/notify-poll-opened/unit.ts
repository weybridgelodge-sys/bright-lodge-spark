// JOB CL: a poll's own unit_id must match the caller's unit; a null unit
// (pre-CL rows) keeps the old behaviour (allowed).
export function pollUnitAllowed(pollUnit: unknown, callerUnit: string): boolean {
  const u = typeof pollUnit === "string" ? pollUnit.trim() : "";
  return !u || u === callerUnit;
}
