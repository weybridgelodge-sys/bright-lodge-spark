// Province return destinations live in unit_settings key 'province' (Unit Setup).
// The retired module_settings keys are never read. A missing address returns ""
// and callers must refuse to send (no fallback address).
export type ReturnKind = "provincial" | "installation";
export const PROVINCE_SETTING_KEY = "province";
export const PROVINCE_EMAIL_FIELD: Record<ReturnKind, string> = {
  provincial: "provincial_return_email",
  installation: "installation_return_email",
};
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The configured address for this return from the province setting value, lower-cased; "" if missing/invalid. */
export function provinceReturnEmail(value: unknown, kind: ReturnKind): string {
  const v = (value && typeof value === "object" ? (value as Record<string, unknown>)[PROVINCE_EMAIL_FIELD[kind]] : null);
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return EMAIL.test(s) ? s : "";
}

type Db = { from: (t: string) => any };

/** Server read: sender's unit (profile), else the only unit. Never throws; "" on any problem. */
export async function loadProvinceReturnEmail(admin: Db, userId: string, kind: ReturnKind): Promise<string> {
  try {
    const { data: p } = await admin.from("profiles").select("unit_id").eq("id", userId).maybeSingle();
    let unit = typeof p?.unit_id === "string" ? p.unit_id : "";
    if (!unit) {
      const { data: units } = await admin.from("units").select("id").limit(2);
      if (!units || units.length !== 1) return "";
      unit = String(units[0].id);
    }
    const { data } = await admin.from("unit_settings").select("value").eq("unit_id", unit).eq("key", PROVINCE_SETTING_KEY).maybeSingle();
    return provinceReturnEmail(data?.value, kind);
  } catch (_e) {
    return "";
  }
}
