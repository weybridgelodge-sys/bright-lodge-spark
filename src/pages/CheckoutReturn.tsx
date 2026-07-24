import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

type Status = "loading" | "paid" | "pending" | "waitlisted" | "error";

const CheckoutReturn = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<Status>("loading");
  const [booking, setBooking] = useState<any>(null);

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
      const data = resp?.booking ?? null;
      if (cancelled) return;
      if (data?.payment_status === "waitlisted") {
        setBooking(data);
        setStatus("waitlisted");
        return;
      }
      if (data?.payment_status === "paid") {
        setBooking(data);
        setStatus("paid");
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
                  Thank you, <strong>{booking?.contact_name}</strong>. We've received your payment for{" "}
                  <strong>{booking?.event_label}</strong>.
                </p>
                <p className="text-muted-foreground text-sm mb-2">
                  A card receipt has been emailed to <strong>{booking?.contact_email}</strong>.
                </p>
                {booking?.total_pence != null && (
                  <p className="text-foreground font-sans font-semibold mb-6">
                    Total paid: £{(booking.total_pence / 100).toFixed(2)}
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
            {status === "pending" && (
              <>
                <Clock className="w-12 h-12 text-gold mx-auto mb-4" />
                <h1 className="text-2xl font-serif text-foreground mb-2">Payment processing</h1>
                <p className="text-muted-foreground mb-6">
                  We've received your details and Stripe is processing the payment. You'll receive a card receipt by email shortly. You may close this page.
                </p>
                <Link to="/" className="text-gold hover:underline">Back to Home</Link>
              </>
            )}
            {status === "error" && (
              <>
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-serif text-foreground mb-2">Booking not found</h1>
                <p className="text-muted-foreground mb-6">
                  We couldn't match this return link to a booking. If you were charged, please contact{" "}
                  <a className="text-gold hover:underline" href="mailto:assistantsecretary@weybridgelodge.org.uk">
                    assistantsecretary@weybridgelodge.org.uk
                  </a>.
                </p>
                <Link to="/" className="text-gold hover:underline">Back to Home</Link>
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
