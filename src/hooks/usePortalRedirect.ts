import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MEMBER_BOOKINGS_MODULE_KEY } from "@/lib/memberBookings";
import { MEMBER_BOOKINGS_REDIRECT_KEY, shouldRedirectToPortal } from "@/lib/portalBooking";

/** "/members/book" when a signed-in active member opens the public Bookings page and both switches are on; else null.
 *  Visitors never wait on this: with no session it resolves to null straight away. */
export function usePortalRedirect(): string | null {
  const { session, profile } = useAuth();
  const { search } = useLocation();
  const [switchOn, setSwitchOn] = useState(false);
  useEffect(() => {
    if (!session) { setSwitchOn(false); return; }
    let live = true;
    supabase.from("module_settings").select("key, value").in("key", [MEMBER_BOOKINGS_MODULE_KEY, MEMBER_BOOKINGS_REDIRECT_KEY])
      .then(({ data }) => {
        const on = (k: string) => (data ?? []).some((r: { key: string; value: unknown }) => r.key === k && r.value === true);
        if (live) setSwitchOn(on(MEMBER_BOOKINGS_MODULE_KEY) && on(MEMBER_BOOKINGS_REDIRECT_KEY));
      }, () => {});
    return () => { live = false; };
  }, [session]);
  return shouldRedirectToPortal({ signedIn: !!session, activeMember: profile?.status === "active", switchOn, search }) ? "/members/book" : null;
}
