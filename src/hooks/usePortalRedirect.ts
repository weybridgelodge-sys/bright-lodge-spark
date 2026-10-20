import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MEMBER_BOOKINGS_MODULE_KEY } from "@/lib/memberBookings";
import { MEMBER_BOOKINGS_REDIRECT_KEY, shouldRedirectToPortal } from "@/lib/portalBooking";

/** "/members/book" when a signed-in active member opens the public Bookings page and both switches are on; else null.
 *  The public site has no auth context, so this reads the session directly. module_settings is readable only by
 *  active members (RLS), so readable rows also prove active membership. Visitors never query anything. */
export function usePortalRedirect(): string | null {
  const { search } = useLocation();
  const [state, setState] = useState({ signedIn: false, activeMember: false, switchOn: false });
  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("module_settings").select("key, value")
        .in("key", [MEMBER_BOOKINGS_MODULE_KEY, MEMBER_BOOKINGS_REDIRECT_KEY]);
      const rows = (data ?? []) as { key: string; value: unknown }[];
      const on = (k: string) => rows.some((r) => r.key === k && r.value === true);
      if (live) setState({ signedIn: true, activeMember: rows.length > 0, switchOn: on(MEMBER_BOOKINGS_MODULE_KEY) && on(MEMBER_BOOKINGS_REDIRECT_KEY) });
    })().catch(() => {});
    return () => { live = false; };
  }, []);
  return shouldRedirectToPortal({ ...state, search }) ? "/members/book" : null;
}
