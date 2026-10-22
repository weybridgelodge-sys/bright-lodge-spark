// Public-site lodge details (footer/header) from get_public_unit_profile().
// Edited on Members > Admin > Unit Setup; nothing here is typed in code.
// Cached in sessionStorage so later pages render without a gap.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UnitProfile = {
  lodgeName: string; lodgeNumber: string; consecrationYear: string; provinceName: string; icoNumber: string;
  facebookUrl: string; instagramUrl: string; twitterUrl: string; venueName: string; venueLines: string[]; siteUrl: string;
};
const s = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

export function parseUnitProfile(row: unknown): UnitProfile {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    lodgeName: s(r.lodge_name), lodgeNumber: s(r.lodge_number), consecrationYear: s(r.consecration_year),
    provinceName: s(r.province_name), icoNumber: s(r.ico_number), facebookUrl: s(r.facebook_url),
    instagramUrl: s(r.instagram_url), twitterUrl: s(r.twitter_url), venueName: s(r.venue_name),
    venueLines: Array.isArray(r.venue_lines) ? r.venue_lines.map(s).filter(Boolean) : [], siteUrl: s(r.site_url),
  };
}

/** "<name> No. <number>"; blank parts skipped. */
export const unitTitle = (p: Pick<UnitProfile, "lodgeName" | "lodgeNumber">) =>
  [p.lodgeName, p.lodgeNumber ? `No. ${p.lodgeNumber}` : ""].filter(Boolean).join(" ");

const KEY = "unit-profile-v1";
const read = (): UnitProfile | null => { try { const v = sessionStorage.getItem(KEY); return v ? parseUnitProfile(JSON.parse(v)) : null; } catch { return null; } };
let inflight: Promise<unknown> | null = null;

export function useUnitProfile(): UnitProfile {
  const [p, setP] = useState<UnitProfile>(() => read() ?? parseUnitProfile(null));
  useEffect(() => {
    let live = true;
    inflight ??= (supabase.rpc as any)("get_public_unit_profile").then(({ data, error }: { data: unknown; error: unknown }) => {
      if (error) { inflight = null; return null; }
      try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
      return data;
    });
    inflight.then((d) => { if (live && d) setP(parseUnitProfile(d)); }, () => {});
    return () => { live = false; };
  }, []);
  return p;
}
