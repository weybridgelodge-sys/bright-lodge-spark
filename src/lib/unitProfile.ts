// Public-site lodge details (footer/header) from get_public_unit_profile().
// Edited on Members > Admin > Unit Setup; nothing here is typed in code.
// Cached in sessionStorage so later pages render without a gap.
import { useEffect, useState } from "react";
import { fetchUnitProfileRow } from "@/lib/unitProfileFetch";

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
  const data = await fetchUnitProfileRow();
  if (!data) return cached ?? parseUnitProfile(null);
  save(data);
  return parseUnitProfile(data);
}

const KEY = "unit-profile-v3";
const LOCAL_KEY = "unit-profile-last-good-v1";
const parseStored = (v: string | null): UnitProfile | null => {
  if (!v) return null;
  try {
    const o = JSON.parse(v);
    if (!o || typeof o !== "object" || Array.isArray(o)) return null;
    const p = parseUnitProfile(o);
    return p.lodgeName ? p : null; // malformed / empty rows are ignored
  } catch { return null; }
};
/** Session cache first, then the last good profile from a previous visit. */
export const read = (): UnitProfile | null => {
  try { const s1 = parseStored(sessionStorage.getItem(KEY)); if (s1) return s1; } catch { /* storage unavailable */ }
  try { return parseStored(localStorage.getItem(LOCAL_KEY)); } catch { return null; }
};
const save = (data: unknown) => {
  const v = JSON.stringify(data);
  try { sessionStorage.setItem(KEY, v); } catch { /* storage unavailable */ }
  try { if (parseStored(v)) localStorage.setItem(LOCAL_KEY, v); } catch { /* storage unavailable */ }
};
let saved: Promise<unknown> | null = null;

/** Stale-while-revalidate: cached profile on first render, refreshed from the shared request every load. */
export function useUnitProfile(): UnitProfile {
  const [p, setP] = useState<UnitProfile>(() => read() ?? parseUnitProfile(null));
  useEffect(() => {
    let live = true;
    const req = fetchUnitProfileRow();
    if (saved !== req) { saved = req; req.then((d) => { if (d) save(d); }); }
    req.then((d) => { if (live && d) setP(parseUnitProfile(d)); });
    return () => { live = false; };
  }, []);
  return p;
}
