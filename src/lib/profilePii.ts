import { supabase } from "@/integrations/supabase/client";

export type ProfilePii = {
  id: string;
  date_of_birth: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
  ugle_reg_number: string | null;
};

/**
 * Fetches sensitive profile fields (DOB, phone, address, UGLE no.) via the
 * `get_profiles_pii` server function. Only returns rows the caller is permitted
 * to see (self, admin, secretary, WM, almoner, IPM). Returns an empty array on
 * any error so callers can safely merge with []  default values.
 */
export async function fetchProfilesPii(ids: string[]): Promise<ProfilePii[]> {
  if (!ids.length) return [];
  const uniq = Array.from(new Set(ids));
  const { data, error } = await (supabase as any).rpc("get_profiles_pii", { _ids: uniq });
  if (error) return [];
  return (data as ProfilePii[]) ?? [];
}

export function indexPii(rows: ProfilePii[]): Record<string, ProfilePii> {
  const map: Record<string, ProfilePii> = {};
  for (const r of rows) map[r.id] = r;
  return map;
}

/** Merge PII rows into an array of profile-shaped objects by `id`. */
export async function enrichWithPii<T extends { id: string }>(rows: T[]): Promise<(T & Partial<ProfilePii>)[]> {
  const pii = await fetchProfilesPii(rows.map((r) => r.id));
  const idx = indexPii(pii);
  return rows.map((r) => ({ ...r, ...(idx[r.id] ?? {}) }));
}
