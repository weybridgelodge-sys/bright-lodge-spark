import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import MeetingBookingForm, { useDiningOption, type MeetingBookingPrefill } from "@/components/bookings/MeetingBookingForm";
import { PaymentTestModeBanner } from "@/components/payments/PaymentTestModeBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useInitialLoading } from "@/hooks/useInitialLoading";
import { useMemberBookingsEnabled } from "@/hooks/useMemberBookingsEnabled";
import { type EventBundle } from "@/lib/lodgeEvents";
import { cardFooter, isBookingClosed, memberStatus, type BookableItem } from "@/lib/memberBookings";
import { loadMeetingBundle } from "@/lib/portalBooking";

type Loaded = { item: BookableItem; bundle: EventBundle; meeting: { id: string; event_key: string } } | null;

/** Portal booking for a meeting: the same form and booking functions as the public page, prefilled from the member's record. */
export default function BookMeeting() {
  const { itemId = "" } = useParams();
  const enabled = useMemberBookingsEnabled();
  const { profile } = useAuth();
  const [loaded, setLoaded] = useState<Loaded>(null);
  const [lodgeName, setLodgeName] = useState<string | null>(null);
  const [loading, setLoading] = useInitialLoading();

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    (async () => {
      const { data } = await (supabase.rpc as any)("get_my_bookable_items");
      const item = ((data as BookableItem[]) ?? []).find((i) => i.kind === "meeting" && i.id === itemId) ?? null;
      const res = item ? await loadMeetingBundle(item) : null;
      if (live) { setLoaded(item && res ? { item, ...res } : null); setLoading(false); }
    })().catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [enabled, itemId, setLoading]);

  const unitId = (profile as { unit_id?: string | null } | null)?.unit_id ?? null;
  useEffect(() => {
    if (!unitId) { if (profile) setLodgeName(""); return; }
    supabase.from("units" as never).select("name").eq("id", unitId).maybeSingle()
      .then(({ data }) => setLodgeName(((data as { name?: string | null } | null)?.name ?? "").trim()), () => setLodgeName(""));
  }, [unitId, profile]);

  if (enabled === false) return <Navigate to="/members" replace />;

  const status = loaded ? memberStatus(loaded.item.bookings, loaded.item.register) : "not_booked";
  const footer = loaded ? cardFooter(status, isBookingClosed(loaded.item)) : null;
  const prefill: MeetingBookingPrefill = {
    title: profile?.title?.trim() || "", firstName: profile?.first_name?.trim() || "", lastName: profile?.last_name?.trim() || "",
    lodge: lodgeName ?? "", email: profile?.email?.trim() || "", phone: profile?.phone?.trim() || "",
  };

  return (
    <MembersLayout>
      <PaymentTestModeBanner />
      <p className="mb-4"><Link to="/members/book" className="font-sans text-sm text-gold underline underline-offset-4 inline-flex items-center min-h-[44px]">Back to Book my place</Link></p>
      {enabled === null || loading || lodgeName === null ? (
        <p className="font-sans text-sm text-primary-foreground/80" role="status">Loading…</p>
      ) : !loaded ? (
        <p className="font-sans text-sm text-primary-foreground" role="alert">This meeting is not open to book.</p>
      ) : footer?.kind !== "book" ? (
        <>
          <h1 className="font-serif text-2xl text-gold mb-2 break-words">{loaded.item.title}</h1>
          <p className="font-sans text-sm text-primary-foreground">{footer?.text}</p>
        </>
      ) : (
        <>
          <h1 className="font-serif text-2xl text-gold mb-4 break-words">{loaded.item.title}</h1>
          <PortalForm bundle={loaded.bundle} meeting={loaded.meeting} prefill={prefill} />
        </>
      )}
    </MembersLayout>
  );
}

function PortalForm({ bundle, meeting, prefill }: { bundle: EventBundle; meeting: { id: string; event_key: string }; prefill: MeetingBookingPrefill }) {
  const [diningOptionId, setDiningOptionId] = useDiningOption(bundle.diningOptions);
  return (
    <div className="max-w-2xl">
      <MeetingBookingForm bundle={bundle} publishedMeeting={meeting} diningOptionId={diningOptionId} setDiningOptionId={setDiningOptionId}
        prefill={prefill} doneHref="/members/book" doneLabel="Back to Book my place" />
    </div>
  );
}
