// Lodge name/number/province/email for members' PDFs, exports and file names.
// Comes from get_lodge_identity (lodge record) plus the province in Unit Setup.
// Nothing is typed in code; a missing value stays blank (identityIssues reports it).
import { supabase } from "@/integrations/supabase/client";
import { loadLodgeIdentity, lodgeTitle, parseLodgeIdentity, type LodgeIdentity } from "@/lib/lodgeIdentity";

export type DocIdentity = LodgeIdentity & { provinceName: string };

export const BLANK_DOC_IDENTITY: DocIdentity = { ...parseLodgeIdentity(null), provinceName: "" };

let cached: Promise<DocIdentity> | null = null;

/** Never throws; blank fields on failure. Cached for the session after a success. */
export function loadDocIdentity(): Promise<DocIdentity> {
  cached ??= (async () => {
    const [id, prof] = await Promise.all([
      loadLodgeIdentity().catch(() => parseLodgeIdentity(null)),
      (supabase.rpc as any)("get_public_unit_profile").then((r: any) => r?.data ?? null, () => null),
    ]);
    const province = typeof prof?.province_name === "string" ? prof.province_name.trim() : "";
    const out = { ...id, provinceName: province };
    if (!out.lodgeName) cached = null; // retry next time
    return out;
  })();
  return cached;
}

/** "<name> No. <number>" or "" */
export const docTitle = (id: Pick<DocIdentity, "lodgeName" | "lodgeNumber">) => lodgeTitle(id);

/** "No. <number> — <province>" with blank parts skipped. */
export const docSubtitle = (id: Pick<DocIdentity, "lodgeNumber" | "provinceName">) =>
  [id.lodgeNumber ? `No. ${id.lodgeNumber}` : "", id.provinceName].filter(Boolean).join("  —  ");

/** Group label for exports, e.g. "<name> <number>"; "" when unknown. */
export const docGroupName = (id: Pick<DocIdentity, "lodgeName" | "lodgeNumber">) =>
  [id.lodgeName.replace(/\s+Lodge$/i, ""), id.lodgeNumber].filter(Boolean).join(" ");

const slug = (v: string) => v.toLowerCase().replace(/\s+lodge$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** File name prefixed with the lodge slug when known: "<slug>-<rest>", else "<rest>". */
export const docFileName = (id: Pick<DocIdentity, "lodgeName">, rest: string) =>
  [slug(id.lodgeName), rest].filter(Boolean).join("-");
