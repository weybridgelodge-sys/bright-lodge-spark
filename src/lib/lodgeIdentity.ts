// Lodge name, number, consecration date and email domain for generated
// documents and their screens. Read from get_lodge_identity() (unit-scoped);
// no lodge details are typed into code. A missing value stays blank and is
// reported, never filled with a guess.
import { supabase } from "@/integrations/supabase/client";
import { MONTHS, WEEKDAYS } from "@/lib/meetingDiary";

export type LodgeIdentity = {
  unitId: string;
  lodgeName: string;
  lodgeNumber: string;
  consecrationDate: string;
  secretaryEmail: string;
  emailDomain: string;
};

const s = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

export function parseLodgeIdentity(row: unknown): LodgeIdentity {
  const r = (row ?? {}) as Record<string, unknown>;
  const secretaryEmail = s(r.secretary_email);
  return {
    unitId: s(r.unit_id),
    lodgeName: s(r.lodge_name),
    lodgeNumber: s(r.lodge_number),
    consecrationDate: s(r.consecration_date).slice(0, 10),
    secretaryEmail,
    emailDomain: s(r.email_domain) || (secretaryEmail.includes("@") ? secretaryEmail.split("@")[1] : ""),
  };
}

export function identityIssues(id: LodgeIdentity): string[] {
  const out: string[] = [];
  if (!id.lodgeName) out.push("Lodge name is not set in the lodge settings.");
  if (!id.lodgeNumber) out.push("Lodge number is not set in the lodge settings.");
  if (!id.emailDomain) out.push("Lodge email address is not set in the contact settings.");
  return out;
}

export async function loadLodgeIdentity(): Promise<LodgeIdentity> {
  const { data, error } = await (supabase.rpc as any)("get_lodge_identity");
  if (error) throw error;
  return parseLodgeIdentity(data);
}

/** "<name> No. <number>" built from the record; blank parts are skipped. */
export const lodgeTitle = (id: Pick<LodgeIdentity, "lodgeName" | "lodgeNumber">) =>
  [id.lodgeName, id.lodgeNumber ? `No. ${id.lodgeNumber}` : ""].filter(Boolean).join(" ");

/** Address at the lodge domain, or "" when no domain is set. */
export const lodgeAddress = (local: string, domain: string) => (domain ? `${local}@${domain}` : "");

type Rule = { mode?: string | null; installation_month?: number | null; installation_ordinal?: string | null; installation_weekday?: number | null; fixed_day?: number | null } | null | undefined;

/** By-law wording for the installation rule, e.g. "3rd Wednesday in October". "" when no rule is saved. */
export function installationRuleWording(rule: Rule): string {
  if (!rule?.installation_month) return "";
  const month = MONTHS[rule.installation_month - 1];
  if (!month) return "";
  if (rule.mode === "fixed_date") return rule.fixed_day ? `${rule.fixed_day} ${month}` : "";
  const ord: Record<string, string> = { "1": "1st", "2": "2nd", "3": "3rd", "4": "4th", last: "Last" };
  const o = ord[String(rule.installation_ordinal ?? "")];
  const w = WEEKDAYS[rule.installation_weekday ?? -1];
  return o && w ? `${o} ${w} in ${month}` : "";
}
