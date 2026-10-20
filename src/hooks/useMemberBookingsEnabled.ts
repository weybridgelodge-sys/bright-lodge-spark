import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MEMBER_BOOKINGS_MODULE_KEY } from "@/lib/memberBookings";

/** The member_bookings module switch; off unless the setting is exactly true. null while loading. */
export function useMemberBookingsEnabled(): boolean | null {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    supabase.from("module_settings").select("value").eq("key", MEMBER_BOOKINGS_MODULE_KEY).maybeSingle()
      .then(({ data }) => { if (live) setOn(data?.value === true); }, () => { if (live) setOn(false); });
    return () => { live = false; };
  }, []);
  return on;
}
