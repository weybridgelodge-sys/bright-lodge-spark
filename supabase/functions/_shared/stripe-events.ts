// Events Stripe account ("weybridgelodge.org.uk") — deliberately separate from the
// Lovable-managed lodge Stripe (./stripe.ts). Uses only STRIPE_EVENTS_* secrets.
import { encode } from "https://deno.land/std@0.168.0/encoding/hex.ts";
import Stripe from "https://esm.sh/stripe@22.0.2";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendTransactionalEmail } from "./send-email.ts";

export function eventsStripe(): Stripe {
  const key = Deno.env.get("STRIPE_EVENTS_SECRET_KEY");
  if (!key) throw new Error("STRIPE_EVENTS_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia", httpClient: Stripe.createFetchHttpClient() });
}

export function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

export async function verifyEventsWebhook(req: Request): Promise<any> {
  const secret = Deno.env.get("STRIPE_EVENTS_WEBHOOK_SECRET");
  if (!secret) throw new Error("STRIPE_EVENTS_WEBHOOK_SECRET is not configured");
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  if (!signature || !body) throw new Error("Missing signature or body");
  let timestamp: string | undefined;
  const v1: string[] = [];
  for (const part of signature.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t") timestamp = v;
    if (k === "v1") v1.push(v);
  }
  if (!timestamp || !v1.length) throw new Error("Invalid signature format");
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error("Webhook timestamp too old");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const expected = new TextDecoder().decode(encode(new Uint8Array(sig)));
  if (!v1.includes(expected)) throw new Error("Invalid webhook signature");
  return JSON.parse(body);
}

const SITE = "https://weybridgelodge.org.uk";
const SECRETARY_EMAIL = "secretary@weybridgelodge.org.uk";
const gbp = (p: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format((p || 0) / 100);
const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
/** Capitalise the first name only when typed all lower case ("julien smith" → "Julien smith"); leave McDonald etc. alone. */
export const capFirst = (n?: string | null) => {
  const s = String(n ?? "").trim();
  const [first, ...rest] = s.split(/\s+/);
  if (!first || first !== first.toLowerCase()) return s;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ");
};
export const methodLabel = (m?: string | null) =>
  ({ card: "Card", pay_by_bank: "Pay by Bank", bank_transfer: "Bank transfer", manual: "Cash / cheque" } as Record<string, string>)[m || ""] || m || "";

const WEBMASTER_EMAIL = "webmaster@weybridgelodge.org.uk";
/** Lodge recipients: events_notify_email, else Secretary + Webmaster. */
async function lodgeRecipients(sb: any, ev: any): Promise<string[]> {
  if (ev.events_notify_email) {
    return String(ev.events_notify_email).split(/[,;\s]+/).filter((e: string) => e.includes("@"));
  }
  return [SECRETARY_EMAIL, WEBMASTER_EMAIL];
}

export async function sendEventBookingEmails(sb: any, bookingId: string, stage: "booked" | "paid") {
  const { data: b } = await sb.from("event_bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return;
  const { data: ev } = await sb.from("event_accounts").select("*").eq("id", b.event_id).maybeSingle();
  if (!ev) return;
  const { data: guests } = await sb.from("event_guests").select("name,age,is_child,allergies").eq("booking_id", b.id);
  const data = {
    stage,
    eventTitle: ev.public_title || ev.name,
    eventDate: fmtDate(ev.event_date),
    venue: ev.venue || "Guildford Masonic Centre, Hitherbury Close, Guildford GU2 4DR",
    bookerName: capFirst(b.payer_name),
    bookerEmail: b.contact_email,
    bookerPhone: b.contact_phone,
    lodgeLabel: b.lodge_label,
    guests: (guests ?? []).map((g: any) => ({ name: g.name, age: g.age, isChild: g.is_child, dietary: g.allergies })),
    adults: b.adult_count,
    children: b.child_count,
    subtotal: gbp(b.subtotal_pence ?? b.total_pence),
    cardFee: (b.fee_pence ?? 0) > 0 ? gbp(b.fee_pence) : null,
    feeLabel: b.payment_method === "card" ? "Card fee" : "Processing fee",
    total: gbp(b.total_pence),
    paymentMethod: methodLabel(b.payment_method),
    paymentStatus: b.payment_status === "paid" ? "Paid" : "Awaiting payment",
    reference: b.reference,
    bank: b.payment_status === "paid" ? null : b.bank_instructions,
    eventUrl: `${SITE}/events/${ev.slug}`,
    adminUrl: `${SITE}/members/admin/treasurer?tab=event-accounts&event=${ev.id}&booking=${b.id}`,
  };
  if (b.contact_email) {
    const r = await sendTransactionalEmail({
      templateName: "event-booking-customer",
      recipientEmail: b.contact_email,
      idempotencyKey: `event-booking-customer-${b.id}-${stage}`,
      replyTo: SECRETARY_EMAIL,
      templateData: data,
    });
    if (r.error) console.error("event customer email failed", r.error);
  }
  for (const to of await lodgeRecipients(sb, ev)) {
    const r = await sendTransactionalEmail({
      templateName: "event-booking-lodge",
      recipientEmail: to,
      idempotencyKey: `event-booking-lodge-${b.id}-${stage}-${to}`,
      replyTo: b.contact_email || undefined,
      templateData: data,
    });
    if (r.error) console.error("event lodge email failed", to, r.error);
  }
}

/**
 * Record the actual Stripe fees for an event booking from the EVENTS account:
 * the charge fee (balance transaction) plus any refund/dispute fees.
 * Retries once if the balance transaction isn't attached yet. Never throws.
 */
export async function syncEventBookingFees(sb: any, bookingId: string, piId: string | null | undefined, opts: { attempts?: number; retryDelayMs?: number } = {}): Promise<boolean> {
  if (!piId) return false;
  const attempts = opts.attempts ?? 2;
  try {
    const stripe = eventsStripe();
    for (let a = 1; a <= attempts; a++) {
      const pi: any = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge.balance_transaction"] });
      const charge: any = pi.latest_charge;
      const bt: any = charge?.balance_transaction;
      if (!bt || typeof bt === "string") {
        if (a < attempts) { await new Promise((r) => setTimeout(r, opts.retryDelayMs ?? 3000)); continue; }
        console.warn("events: no balance_transaction yet for", piId);
        return false;
      }
      let other = 0;
      const refunds: any = await stripe.refunds.list({ charge: charge.id, limit: 100, expand: ["data.balance_transaction"] });
      for (const r of refunds.data ?? []) if (r.balance_transaction && typeof r.balance_transaction !== "string") other += r.balance_transaction.fee ?? 0;
      const disputes: any = await stripe.disputes.list({ charge: charge.id, limit: 100 });
      for (const d of disputes.data ?? []) for (const t of d.balance_transactions ?? []) other += t.fee ?? 0;
      const { error } = await sb.from("event_bookings").update({
        stripe_fee_pence: bt.fee ?? null, stripe_net_pence: bt.net ?? null,
        stripe_balance_transaction_id: bt.id ?? null, stripe_other_fees_pence: other,
      }).eq("id", bookingId);
      if (error) { console.error("events: store fee failed", error); return false; }
      return true;
    }
    return false;
  } catch (e) {
    console.error("syncEventBookingFees failed", bookingId, e);
    return false;
  }
}
