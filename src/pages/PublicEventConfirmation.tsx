import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { formatGBP } from "@/lib/publicEvents";

type Summary = {
  reference: string; name: string; adults: number; children: number; total_pence: number; subtotal_pence?: number; fee_pence?: number;
  payment_method: string; payment_status: string;
  bank: { account_holder_name?: string; sort_code?: string; account_number?: string; reference?: string } | null;
};

export default function PublicEventConfirmation() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const ref = params.get("ref") || "";
  const token = params.get("t") || "";
  const [b, setB] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let tries = 0;
    const load = async () => {
      tries++;
      const { data, error } = await supabase.functions.invoke("get-event-booking", { body: { reference: ref, token } });
      if (!alive) return;
      if (error || !data?.reference) { setFailed(true); return; }
      setB(data);
      // Card payments confirm via webhook a moment after redirect.
      if (data.payment_status !== "paid" && data.payment_method !== "Bank transfer" && tries < 8) setTimeout(load, 2500);
    };
    if (ref && token) load(); else setFailed(true);
    return () => { alive = false; };
  }, [ref, token]);

  const paid = b?.payment_status === "paid";
  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO title="Booking confirmation" description="Your event booking with Weybridge Lodge No. 6787." noindex />
      <Header />
      <main id="main-content" className="pt-32 pb-20 md:pt-40 bg-background">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl font-sans">
          <h1 className="font-serif text-3xl md:text-4xl text-foreground text-center mb-6">
            {failed ? "Booking not found" : !b ? "Checking your booking…" : paid ? "You're booked!" : "Booking received"}
          </h1>
          {b && (
            <section className="border border-border bg-card rounded-sm p-6 space-y-2" aria-labelledby="summary-heading">
              <h2 id="summary-heading" className="font-serif text-xl text-foreground flex items-center gap-2">
                {paid ? <CheckCircle2 className="w-5 h-5 text-gold-dark" aria-hidden="true" /> : <Clock className="w-5 h-5 text-gold-dark" aria-hidden="true" />}
                Reference {b.reference}
              </h2>
              <p className="text-foreground">{b.adults} adult{b.adults === 1 ? "" : "s"}{b.children ? `, ${b.children} child${b.children === 1 ? "" : "ren"}` : ""} · {formatGBP(b.total_pence)}</p>
              {(b.fee_pence ?? 0) > 0 && <p className="text-sm text-muted-foreground">Subtotal {formatGBP(b.subtotal_pence ?? b.total_pence - (b.fee_pence ?? 0))} + {b.payment_method === "Card" ? "card fee" : "processing fee"} {formatGBP(b.fee_pence ?? 0)}</p>}
              <p className="text-muted-foreground">Payment: {b.payment_method} — {paid ? "paid" : "pending payment"}</p>
              <p className="text-muted-foreground">A confirmation email is on its way to you.</p>
            </section>
          )}
          {b && !paid && b.bank && (
            <section className="mt-6 border border-gold rounded-sm bg-card p-6 space-y-1" aria-labelledby="bank-heading">
              <h2 id="bank-heading" className="font-serif text-xl text-foreground mb-2">Bank transfer details</h2>
              <p className="text-foreground">Account name: <strong>{b.bank.account_holder_name}</strong></p>
              <p className="text-foreground">Sort code: <strong>{b.bank.sort_code}</strong></p>
              <p className="text-foreground">Account number: <strong>{b.bank.account_number}</strong></p>
              <p className="text-foreground">Payment reference: <strong className="break-words">{b.bank.reference}</strong></p>
              <div className="mt-4 border-2 border-gold bg-card rounded-sm p-4 space-y-2">
                <p className="font-sans text-base font-bold text-foreground">Amount to transfer: {formatGBP(b.total_pence)}</p>
                <p className="font-sans text-[15px] font-bold leading-relaxed text-foreground">
                  Please use the payment reference exactly as shown so we can match your payment. We will email you when it arrives.
                </p>
              </div>
            </section>
          )}
          {failed && <p className="text-center text-muted-foreground">We couldn't find that booking. Please check your confirmation email or contact us.</p>}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/events" className="inline-flex items-center justify-center min-h-[48px] px-6 bg-gold-shimmer text-accent-foreground font-semibold rounded-sm">Back to events</Link>
            {slug && <Link to={`/events/${slug}`} className="inline-flex items-center justify-center min-h-[48px] px-6 border border-gold-dark text-gold-dark font-semibold rounded-sm">Event details</Link>}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
