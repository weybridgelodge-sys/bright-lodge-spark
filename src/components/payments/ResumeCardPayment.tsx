import { useRef, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { readFunctionError } from "@/lib/functionError";
import { formatGBP } from "@/lib/publicEvents";
import { heldUntilLabel } from "@/lib/memberBookings";

type Props = { bookingId: string; totalPence: number | null; holdUntil: string; title: string; onReleased?: () => void };

/** "Continue to payment" for the member's own pending card booking. Resumes the SAME booking; one request in flight. */
export function ResumeCardPayment({ bookingId, totalPence, holdUntil, title, onReleased }: Props) {
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const inFlight = useRef(false);

  const start = async () => {
    if (inFlight.current || secret) return; // double-tap safe
    inFlight.current = true; setBusy(true); setMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("resume-booking-checkout", {
        body: { booking_id: bookingId, return_url: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}` },
      });
      if (error) { setMsg(await readFunctionError(error, data, "Payment could not be resumed. Please try again.")); return; }
      if (data?.state === "open" && data.clientSecret) { setSecret(data.clientSecret); return; }
      if (data?.state === "paid") { setMsg("This booking is already paid."); return; }
      setMsg("Your card hold has been released. You can book again.");
      onReleased?.();
    } finally { inFlight.current = false; setBusy(false); }
  };

  return (
    <div className="space-y-2">
      <p className="font-sans text-sm text-primary-foreground">
        Card payment of {totalPence != null ? formatGBP(totalPence) : "your booking"} (including the card fee) is not finished. {heldUntilLabel(holdUntil)}.
      </p>
      {!secret && (
        <button type="button" onClick={start} disabled={busy} aria-busy={busy}
          className="w-full inline-flex items-center justify-center min-h-[44px] px-5 rounded-sm bg-gold text-navy font-sans font-semibold text-sm hover:bg-gold-light disabled:opacity-70">
          {busy ? "Opening payment…" : "Continue to payment"}<span className="sr-only">: {title}</span>
        </button>
      )}
      {msg && <p className="font-sans text-sm text-primary-foreground" role="status">{msg}</p>}
      {secret && (
        <div className="bg-white rounded-sm overflow-hidden">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret: secret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      )}
    </div>
  );
}
