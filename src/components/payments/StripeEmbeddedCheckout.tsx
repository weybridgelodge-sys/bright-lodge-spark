import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

export type BookingLineItem = {
  label: string;
  qty: number;
  unit_price_pence: number;
};

export interface CheckoutRequest {
  event_key: "festive_board_april_2026" | "ladies_festival_2026";
  event_label: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  line_items: BookingLineItem[];
  details?: Record<string, unknown>;
  cover_fee: boolean;
  return_url: string;
}

interface Props extends CheckoutRequest {
  onError?: (msg: string) => void;
}

export function StripeEmbeddedCheckoutPanel(props: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        event_key: props.event_key,
        event_label: props.event_label,
        contact_name: props.contact_name,
        contact_email: props.contact_email,
        contact_phone: props.contact_phone,
        line_items: props.line_items,
        details: props.details ?? {},
        cover_fee: props.cover_fee,
        return_url: props.return_url,
        environment: getStripeEnvironment(),
      },
    });
    if (error || !data?.clientSecret) {
      const msg = error?.message || data?.error || "Failed to create checkout session";
      props.onError?.(typeof msg === "string" ? msg : "Failed to create checkout session");
      throw new Error(typeof msg === "string" ? msg : "Failed to create checkout session");
    }
    return data.clientSecret;
  };

  return (
    <div id="checkout" className="bg-white rounded-sm overflow-hidden">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
