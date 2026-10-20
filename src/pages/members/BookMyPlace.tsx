import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import { supabase } from "@/integrations/supabase/client";
import { useInitialLoading } from "@/hooks/useInitialLoading";
import { useMemberBookingsEnabled } from "@/hooks/useMemberBookingsEnabled";
import { CalendarDays, CalendarClock, PoundSterling } from "lucide-react";
import {
  effectiveDeadline, isBookingClosed, memberStatus, STATUS_LABEL, visibleItems,
  type BookableItem, type MemberBookingStatus,
} from "@/lib/memberBookings";
import { formatGBP } from "@/lib/publicEvents";

const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
const fmtDeadline = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });

const BADGE: Record<MemberBookingStatus, string> = {
  not_booked: "border-gold/40 text-primary-foreground",
  pending: "border-gold text-gold",
  booked: "border-gold bg-gold text-navy",
  waitlisted: "border-gold/70 text-gold",
  apologies: "border-primary-foreground/50 text-primary-foreground",
};

function Card({ item }: { item: BookableItem }) {
  const status = memberStatus(item.bookings, item.register);
  const closed = isBookingClosed(item);
  const canBook = !closed && (status === "not_booked" || status === "apologies");
  return (
    <li className="bg-navy-dark/60 border border-gold/15 rounded-sm p-5 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <h2 className="font-serif text-lg text-gold break-words min-w-0">{item.title}</h2>
        <span className={`text-xs font-sans font-semibold uppercase tracking-wider border rounded-sm px-2 py-1 shrink-0 ${BADGE[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      <dl className="font-sans text-sm space-y-1.5 text-primary-foreground/90">
        <div className="flex gap-2"><dt className="sr-only">Date</dt><CalendarDays className="w-4 h-4 text-gold shrink-0 mt-0.5" aria-hidden="true" /><dd>{fmtDate(item.event_date)}</dd></div>
        {item.price_pence != null && (
          <div className="flex gap-2"><dt className="sr-only">Price</dt><PoundSterling className="w-4 h-4 text-gold shrink-0 mt-0.5" aria-hidden="true" />
            <dd>{formatGBP(item.price_pence)} per person{item.child_price_pence != null && item.child_price_pence !== item.price_pence ? ` (children ${formatGBP(item.child_price_pence)})` : ""}</dd></div>
        )}
        <div className="flex gap-2"><dt className="sr-only">Booking deadline</dt><CalendarClock className="w-4 h-4 text-gold shrink-0 mt-0.5" aria-hidden="true" />
          <dd>Book by {fmtDeadline(effectiveDeadline(item.booking_deadline, item.event_date))}</dd></div>
      </dl>
      <div className="mt-4">
        {closed ? (
          <p className="font-sans text-sm text-primary-foreground">Booking closed, contact the Secretary.</p>
        ) : canBook ? (
          <Link to={item.book_path} className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-sm bg-gold text-navy font-sans font-semibold text-sm hover:bg-gold-light">
            Book my place<span className="sr-only">: {item.title}</span>
          </Link>
        ) : status === "pending" ? (
          <p className="font-sans text-sm text-primary-foreground">Your card payment is being held. If it is not completed within the hour the hold is released.</p>
        ) : (
          <p className="font-sans text-sm text-primary-foreground">To change this booking, contact the Secretary.</p>
        )}
      </div>
    </li>
  );
}

export default function BookMyPlace() {
  const enabled = useMemberBookingsEnabled();
  const [items, setItems] = useState<BookableItem[]>([]);
  const [loading, setLoading] = useInitialLoading();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    (supabase.rpc as any)("get_my_bookable_items").then(({ data, error }: any) => {
      if (error) setFailed(true); else setItems(visibleItems((data as BookableItem[]) ?? []));
      setLoading(false);
    });
  }, [enabled, setLoading]);

  if (enabled === false) return <Navigate to="/members" replace />;

  return (
    <MembersLayout>
      <header className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl text-gold">Book my place</h1>
        <p className="font-sans text-sm text-primary-foreground/80">Meetings and events open to you, and whether you have booked.</p>
      </header>
      {enabled === null || loading ? (
        <p className="font-sans text-sm text-primary-foreground/80" role="status">Loading…</p>
      ) : failed ? (
        <p className="font-sans text-sm text-primary-foreground" role="alert">Bookings could not be loaded. Please try again later.</p>
      ) : items.length === 0 ? (
        <p className="font-sans text-sm text-primary-foreground/80">Nothing is open to book at the moment.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">{items.map((i) => <Card key={`${i.kind}-${i.id}`} item={i} />)}</ul>
      )}
    </MembersLayout>
  );
}
