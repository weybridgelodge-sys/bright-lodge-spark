// Lodge for this page's own web address (resolve-site-unit → unit_domains).
// No default lodge: an unknown address resolves to null and callers show their empty state.
import { supabase } from "@/integrations/supabase/client";

let cached: Promise<string | null> | null = null;

export function resolveSiteUnit(): Promise<string | null> {
  if (!cached) {
    cached = supabase.functions.invoke("resolve-site-unit", { body: {} }).then(
      ({ data, error }) => {
        const id = !error && typeof data?.unit_id === "string" ? data.unit_id.trim() : "";
        if (!id) cached = null; // allow a retry later
        return id || null;
      },
      () => { cached = null; return null; },
    );
  }
  return cached;
}

/** Test hook. */
export const resetSiteUnit = () => { cached = null; };
