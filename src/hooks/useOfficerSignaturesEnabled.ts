import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const OFFICER_SIGNATURES_MODULE_KEY = "officer_signatures";

/** The officer_signatures module switch; off unless the setting is exactly true. null while loading. */
export function useOfficerSignaturesEnabled(): boolean | null {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    supabase.from("module_settings").select("value").eq("key", OFFICER_SIGNATURES_MODULE_KEY).maybeSingle()
      .then(({ data }) => { if (live) setOn(data?.value === true); }, () => { if (live) setOn(false); });
    return () => { live = false; };
  }, []);
  return on;
}
