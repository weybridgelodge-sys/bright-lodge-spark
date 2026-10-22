// Unit Setup save safety: only fields the user changed are sent, and a
// required field that held a value may not be cleared.
export type FieldMap<F> = Partial<Record<keyof F, string>>;

/** Fields among `keys` whose current value differs from the loaded value. */
export function changedFields<F extends Record<string, string>>(loaded: F, current: F, keys: (keyof F)[]): (keyof F)[] {
  return keys.filter((k) => (current[k] ?? "") !== (loaded[k] ?? ""));
}

/** Errors for required fields the user emptied. */
export function clearedRequired<F extends Record<string, string>>(current: F, changed: (keyof F)[], required: (keyof F)[], label = "This field is required and cannot be cleared.") {
  const e: Partial<Record<keyof F, string>> = {};
  for (const k of changed) if (required.includes(k) && !(current[k] ?? "").trim()) e[k] = label;
  return e;
}

/** Patch holding only the changed fields, renamed to stored keys and trimmed. */
export function patchFor<F extends Record<string, string>>(current: F, changed: (keyof F)[], map: FieldMap<F>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of changed) { const to = map[k]; if (to) out[to] = (current[k] ?? "").trim(); }
  return out;
}

export const REQUIRED_UNIT_FIELDS = ["account_name", "sort_code", "account_number", "cheque_payee"] as const;
