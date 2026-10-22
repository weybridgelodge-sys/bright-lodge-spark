import { bookingAmountLines } from "../../supabase/functions/_shared/bookingAmounts";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useBookingDetails } from "@/lib/bookingDetails";
import { classifyReturn, EXPIRED_SESSION_MESSAGE } from "@/lib/checkoutReturnState";

type Status = "loading" | "paid" | "pending" | "waitlisted" | "expired" | "error";

const CheckoutReturn = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<Status>("loading");
  const [booking, setBooking] = useState<any>(null);
  // Unit Setup booking contact, else the Assistant Secretary (get_public_booking_details).
  const contactEmail = useBookingDetails().contactEmail;

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      const { data: resp } = await supabase.functions.invoke("get-booking-by-session", {
        body: { session_id: sessionId },
      });
      if (cancelled) return;
      const kind = classifyReturn(resp ?? null);
      const data = resp?.booking ?? null;
      if (kind === "expired") { setStatus("expired"); return; }
      if (kind === "waitlisted" || kind === "paid") {
        setBooking(data);
        setStatus(kind);
        return;
      }
      if (data && attempts < 8) {
        setBooking(data);
        setStatus("pending");
        setTimeout(poll, 1500);
        return;
      }
      if (!data && attempts < 4) {
        setTimeout(poll, 1500);
        return;
      }
      setBooking(data);
      setStatus(data ? "pending" : "error");
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="min-h-screen">
      <SEO title="Booking Confirmation" description="Confirmation of your Weybridge Lodge dining or event booking — view your reference and next steps." canonical="/checkout/return" />
      <Header />
      <main className="bg-navy-gradient py-24 min-h-[60vh]">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-card rounded-sm border border-border shadow-lg p-8 text-center">
            {status === "loading" && (
              <>
                <Clock className="w-12 h-12 text-gold mx-auto mb-4 animate-spin" />
                <h1 className="text-2xl font-serif text-foreground mb-2">Confirming your booking…</h1>
                <p className="text-muted-foreground text-sm">This usually takes a few seconds.</p>
              </>
            )}
            {status === "paid" && (
              <>
                <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto mb-4" />
                <h1 className="text-2xl font-serif text-foreground mb-2">Booking confirmed</h1>
                <p className="text-muted-foreground mb-6">
                  Thank you{booking?.contact_name ? <>, <strong>{booking.contact_name}</strong></> : null}. We've received your payment for{" "}
                  <strong>{booking?.event_label}</strong>.
                </p>
                <p className="text-muted-foreground text-sm mb-2">
                  A card receipt has been emailed to <strong>{booking?.contact_email}</strong>.
                </p>
                {booking?.total_pence != null && (
                  <dl className="text-foreground font-sans mb-6 mx-auto max-w-xs space-y-1">
                    {bookingAmountLines(booking.subtotal_pence, booking.fee_pence, booking.total_pence).map((l) => (
                      <div key={l.label} className={`flex justify-between gap-4 ${l.label === "Total" ? "font-semibold" : "text-muted-foreground"}`}>
                        <dt>{l.label === "Total" ? "Total paid" : l.label}</dt><dd>{l.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <Link
                  to="/"
                  className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  Back to Home
                </Link>
              </>
            )}
            {status === "pending" && (
              <>
                <Clock className="w-12 h-12 text-gold mx-auto mb-4" />
                <h1 className="text-2xl font-serif text-foreground mb-2">Payment processing</h1>
                <p className="text-muted-foreground mb-6">
                  We've received your details and Stripe is processing the payment. You'll receive a card receipt by email shortly. You may close this page.
                </p>
                <Link to="/" className="text-gold-dark hover:underline">Back to Home</Link>
              </>
            )}
            {status === "waitlisted" && (
              <>
                <Clock className="w-12 h-12 text-gold mx-auto mb-4" />
                <h1 className="text-2xl font-serif text-foreground mb-2">You're on the waitlist</h1>
                <p className="text-muted-foreground mb-4">
                  Thank you{booking?.contact_name ? <>, <strong>{booking.contact_name}</strong></> : null}. The dining room for{" "}
                  <strong>{booking?.event_label}</strong> is currently full, so your booking is being held on the waitlist.
                </p>
                <p className="text-muted-foreground text-sm mb-4">
                  Your card has been charged in full to hold your place in the queue. If a seat opens up before the event, you'll be promoted automatically and confirmed by email — no further action needed. If no seat opens up by the day of the event, your payment will be refunded in full automatically.
                </p>
                {booking?.total_pence != null && (
                  <p className="text-foreground font-sans font-semibold mb-6">
                    Held on waitlist: £{(booking.total_pence / 100).toFixed(2)}
                  </p>
                )}
                <Link
                  to="/"
                  className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  Back to Home
                </Link>
              </>
            )}
            {status === "expired" && (
              <>
                <Clock className="w-12 h-12 text-gold-dark mx-auto mb-4" aria-hidden="true" />
                <h1 className="text-2xl font-serif text-foreground mb-2">Booking session expired</h1>
                <p className="text-muted-foreground font-sans mb-6">{EXPIRED_SESSION_MESSAGE}</p>
                <Link
                  to="/bookings"
                  className="inline-flex items-center justify-center min-h-[44px] bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  Start a new booking
                </Link>
              </>
            )}
            {status === "error" && (
              <>
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-serif text-foreground mb-2">Booking not found</h1>
                <p className="text-muted-foreground mb-6">
                  We couldn't match this return link to a booking. If you were charged, please contact the Assistant Secretary
                  {contactEmail ? (
                    <>{" at "}<a className="text-gold-dark underline underline-offset-4 break-all" href={`mailto:${contactEmail}`}>{contactEmail}</a></>
                  ) : null}.
                </p>
                <Link to="/" className="text-gold-dark hover:underline">Back to Home</Link>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutReturn;
