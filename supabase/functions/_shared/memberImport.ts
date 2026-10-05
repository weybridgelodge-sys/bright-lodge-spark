// Pure, runtime-agnostic helpers for the bulk member import (used by the
// admin-import-members edge function and by unit tests). No lodge-specific
// values live here so a future per-lodge setting can wrap it unchanged.

export const IMPORT_TEXT_FIELDS = [
  "title", "first_name", "middle_name", "last_name", "preferred_name", "post_nominals",
  "provincial_rank", "grand_rank", "phone",
  "address_line1", "address_line2", "address_line3", "town", "county", "postcode",
  "ugle_reg_number", "dietary_requirements",
] as const;
export const IMPORT_DATE_FIELDS = [
  "date_of_birth", "initiation_date", "passing_date", "raising_date", "joined_lodge_date",
] as const;
export const IMPORT_BOOL_FIELDS = ["is_past_master", "is_royal_arch", "is_honorary_member"] as const;

export const TEMPLATE_COLUMNS = [
  "email", "title", "first_name", "middle_name", "last_name", "preferred_name", "post_nominals",
  "provincial_rank", "grand_rank", "phone", "address_line1", "address_line2", "address_line3",
  "town", "county", "postcode", "date_of_birth", "initiation_date", "passing_date", "raising_date",
  "joined_lodge_date", "degree", "grand_lodge_number", "is_past_master", "is_royal_arch",
  "is_honorary_member", "dietary_requirements", "status",
];

const TITLES = ["Bro", "W Bro", "VW Bro", "RW Bro"];
const DEGREES = ["entered_apprentice", "fellow_craft", "master_mason", "installed_master"];
const STATUSES = ["pending", "active", "suspended", "year_out", "resigned", "excluded", "deceased"];
const MAX: Record<string, number> = {
  title: 10, first_name: 80, middle_name: 160, last_name: 80, preferred_name: 80, post_nominals: 120,
  provincial_rank: 80, grand_rank: 80, phone: 40, address_line1: 120, address_line2: 120,
  address_line3: 120, town: 80, county: 80, postcode: 20, ugle_reg_number: 40, dietary_requirements: 500,
};

export type ImportRecord = {
  email: string;
  degree: string | null;
  status: string | null;
  [k: string]: string | boolean | null;
};

const ALIASES: Record<string, string> = {
  grand_lodge_number: "ugle_reg_number", grand_lodge_ref_no: "ugle_reg_number", ugle_number: "ugle_reg_number",
  first: "first_name", forename: "first_name", surname: "last_name", last: "last_name",
  dob: "date_of_birth", dietary: "dietary_requirements", post_code: "postcode", email_address: "email",
};

export function normaliseHeader(h: string): string {
  const k = h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return ALIASES[k] ?? k;
}

export function parseDate(v: string): string | null | "invalid" {
  const s = v.trim();
  if (!s) return null;
  let y: number, m: number, d: number;
  let mt = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (mt) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
  else if ((mt = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) { d = +mt[1]; m = +mt[2]; y = +mt[3]; }
  else return "invalid";
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "invalid";
  if (y < 1900 || y > 2100) return "invalid";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseBool(v: string): boolean | null | "invalid" {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  if (["y", "yes", "true", "1", "x"].includes(s)) return true;
  if (["n", "no", "false", "0"].includes(s)) return false;
  return "invalid";
}

function normTitle(v: string): string | null | "invalid" {
  const s = v.trim().replace(/\./g, "").replace(/\s+/g, " ");
  if (!s) return null;
  const hit = TITLES.find((t) => t.toLowerCase() === s.toLowerCase());
  return hit ?? "invalid";
}

/** Validate one raw CSV row (keys already normalised). Unknown columns (incl. roles) are ignored. */
export function validateRow(raw: Record<string, string>): { record?: ImportRecord; errors: string[] } {
  const errors: string[] = [];
  const get = (k: string) => (raw[k] ?? "").toString();
  const email = get("email").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) errors.push("valid email is required");
  const rec: ImportRecord = { email, degree: null, status: null };
  for (const f of IMPORT_TEXT_FIELDS) {
    if (f === "title") {
      const t = normTitle(get(f));
      if (t === "invalid") errors.push(`title must be one of ${TITLES.join(", ")}`); else rec.title = t;
      continue;
    }
    const v = get(f).trim();
    if (v.length > (MAX[f] ?? 200)) errors.push(`${f} is too long`);
    rec[f] = v ? (f === "postcode" ? v.toUpperCase() : v) : null;
  }
  for (const f of IMPORT_DATE_FIELDS) {
    const d = parseDate(get(f));
    if (d === "invalid") errors.push(`${f} is not a real date (use dd/mm/yyyy or yyyy-mm-dd)`); else rec[f] = d;
  }
  for (const f of IMPORT_BOOL_FIELDS) {
    const b = parseBool(get(f));
    if (b === "invalid") errors.push(`${f} must be yes/no`); else rec[f] = b;
  }
  const deg = get("degree").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (deg && !DEGREES.includes(deg)) errors.push(`degree must be one of ${DEGREES.join(", ")}`);
  rec.degree = deg || null;
  const st = get("status").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (st && !STATUSES.includes(st)) errors.push(`status must be one of ${STATUSES.join(", ")}`);
  rec.status = st || null;
  if (!rec.first_name) errors.push("first_name is required");
  if (!rec.last_name) errors.push("last_name is required");
  return errors.length ? { errors } : { record: rec, errors };
}

const isBlank = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

/**
 * Fill-blanks merge for an existing member: returns only the fields to write.
 * Never overwrites a non-blank value; booleans only move false→true; degree,
 * status and email are never changed for existing members.
 */
export function fillBlanks(existing: Record<string, unknown>, rec: ImportRecord): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const f of [...IMPORT_TEXT_FIELDS, ...IMPORT_DATE_FIELDS]) {
    if (!isBlank(rec[f]) && isBlank(existing[f])) patch[f] = rec[f];
  }
  for (const f of IMPORT_BOOL_FIELDS) {
    if (rec[f] === true && existing[f] !== true) patch[f] = true;
  }
  return patch;
}

export function composeFullName(title: unknown, first: unknown, last: unknown): string {
  const t = title ? `${title}. ` : "";
  return `${t}${first ?? ""} ${last ?? ""}`.trim().replace(/\s+/g, " ");
}
