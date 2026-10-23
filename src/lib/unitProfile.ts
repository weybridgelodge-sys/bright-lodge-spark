// Public-site lodge details (footer/header) from get_public_unit_profile().
// Edited on Members > Admin > Unit Setup; nothing here is typed in code.
// Cached in sessionStorage so later pages render without a gap.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UnitProfile = {
  lodgeName: string; lodgeNumber: string; consecrationYear: string; consecrationDate: string; provinceName: string; icoNumber: string;
  facebookUrl: string; instagramUrl: string; twitterUrl: string; venueName: string; venueLines: string[]; siteUrl: string; secretaryEmail: string;
};
const s = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

export function parseUnitProfile(row: unknown): UnitProfile {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    lodgeName: s(r.lodge_name), lodgeNumber: s(r.lodge_number), consecrationYear: s(r.consecration_year), consecrationDate: s(r.consecration_date).slice(0, 10),
    provinceName: s(r.province_name), icoNumber: s(r.ico_number), facebookUrl: s(r.facebook_url),
    instagramUrl: s(r.instagram_url), twitterUrl: s(r.twitter_url), venueName: s(r.venue_name),
    venueLines: Array.isArray(r.venue_lines) ? r.venue_lines.map(s).filter(Boolean) : [], siteUrl: s(r.site_url),
    secretaryEmail: s(r.secretary_email).includes("@") ? s(r.secretary_email) : "",
  };
}

/** "<name> No. <number>"; blank parts skipped. */
export const unitTitle = (p: Pick<UnitProfile, "lodgeName" | "lodgeNumber">) =>
  [p.lodgeName, p.lodgeNumber ? `No. ${p.lodgeNumber}` : ""].filter(Boolean).join(" ");

/** "<venue>, <postcode>" for short public lines; postcode taken from the venue's address lines. */
export function venueShort(p: Pick<UnitProfile, "venueName" | "venueLines">): string {
  const pc = p.venueLines.join(" ").match(/[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}/)?.[0] ?? "";
  return [p.venueName, pc].filter(Boolean).join(", ");
}

/** Venue address lines without the venue name, joined: "<street>, <town postcode>". "" when not set. */
export function venueAddress(p: Pick<UnitProfile, "venueName" | "venueLines">): string {
  const parts = p.venueLines.join(" ").split(",").map((x) => x.trim()).filter(Boolean);
  const name = p.venueName.trim().toLowerCase();
  return (name && parts[0]?.toLowerCase() === name ? parts.slice(1) : parts).join(", ");
}

/** Venue name plus address on one line; "" when no venue is set. */
export const venueFull = (p: Pick<UnitProfile, "venueName" | "venueLines">) =>
  [p.venueName, venueAddress(p)].filter(Boolean).join(", ");

/** True when a free-text location names the unit's own venue. */
export const isUnitVenue = (text: string | null | undefined, p: Pick<UnitProfile, "venueName">) =>
  !!p.venueName && !!text && text.toLowerCase().includes(p.venueName.toLowerCase());

/** One-off public read (no React), for data loaders. Blank profile on failure. */
export async function loadUnitProfile(): Promise<UnitProfile> {
  const cached = read();
  if (cached && cached.venueName) return cached;
  const { data, error } = await (supabase.rpc as any)("get_public_unit_profile");
  if (error || !data) return cached ?? parseUnitProfile(null);
  try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
  return parseUnitProfile(data);
}

const KEY = "unit-profile-v3";
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
