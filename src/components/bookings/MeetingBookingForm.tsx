import { attendanceOptions, diningEventLabel, isNonMasonTitle, lodgeRequired } from "@/lib/bookingTitles";
import { StripeEmbeddedCheckoutPanel, type BookingLineItem } from "@/components/payments/StripeEmbeddedCheckout";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { EventBundle } from "@/lib/lodgeEvents";
import { normaliseName, normaliseTitle } from "@/lib/nameCase";
import TurnstileWidget from "@/components/TurnstileWidget";
import { readFunctionError } from "@/lib/functionError";
import { lodgePlaceholder, paymentReference, signOff, useBookingDetails } from "@/lib/bookingDetails";

// Meeting booking form shared by the public Bookings page and the portal (Book my place).
// Lifted verbatim from pages/Bookings.tsx; the public page passes no prefill and behaves as before.

type Guest = { name: string; lodge: string };

// Centralised — replaces eight separate inline initial/whileInView prop objects.
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay },
  }),
  static: { opacity: 1, y: 0 },
};

// border-input and ring-ring are Shadcn CSS variable tokens — retained as-is
// since they control focus rings. TODO: verify these are defined in global CSS.
const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[48px]";
const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[48px]";
// Card processing fee charged to the payer when they opt in: 2% of the
// subtotal plus a flat 20p (covers Stripe fees and the Lodge environmental levy).
export function calcCardFeePence(subtotalPence: number): number {
  return subtotalPence > 0 ? Math.ceil(subtotalPence * 0.02) + 20 : 0;
}

const labelClass = "block text-sm font-sans font-medium text-foreground mb-1";


export type MeetingBookingPrefill = { title?: string; firstName?: string; lastName?: string; lodge?: string; email?: string; phone?: string };

/** Default dining option selection (owned by the page so it can show the selected price). */
export function useDiningOption(diningOptions: EventBundle["diningOptions"]) {
  const [diningOptionId, setDiningOptionId] = useState<string>("");
  useEffect(() => {
    if (!diningOptionId && diningOptions.length) {
      const def = diningOptions.find((o) => o.is_default) || diningOptions[0];
      setDiningOptionId(def.id);
    }
  }, [diningOptions, diningOptionId]);
  return [diningOptionId, setDiningOptionId] as const;
}

export default function MeetingBookingForm({
  bundle, publishedMeeting, diningOptionId, setDiningOptionId, prefill, memberId, doneHref = "/", doneLabel = "Back to Home",
}: {
  bundle: EventBundle;
  publishedMeeting: { id: string; event_key: string } | null;
  diningOptionId: string;
  setDiningOptionId: (id: string) => void;
  prefill?: MeetingBookingPrefill;
  /** Portal only: the signed-in member (from the portal session) for the dietary pre-fill. */
  memberId?: string | null;
  doneHref?: string;
  doneLabel?: string;
}) {
  const { toast } = useToast();
  const shouldReduceMotion = useReducedMotion();
  const { event, diningOptions } = bundle;
  const bd = useBookingDetails();
  const so = signOff(bd);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [step]);

  const [showCheckout, setShowCheckout] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "submitting" | "meeting-only" | "apologies" | "bank-transfer" | "cash-cheque" | "error"
  >("idle");

  const [title, setTitle] = useState(prefill?.title ?? "");
  const [firstName, setFirstName] = useState(prefill?.firstName ?? "");
  const [lastName, setLastName] = useState(prefill?.lastName ?? "");
  const [lodge, setLodge] = useState(prefill?.lodge ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  // Honeypot — must remain empty on legitimate submissions
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  const [meetingOption, setMeetingOption] = useState<
    "meeting-and-festive-board" | "meeting-only" | "apologies" | ""
  >("");
  const [guestCount, setGuestCount] = useState<number>(0);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [dietary, setDietary] = useState("");
  // Pre-fill (only while empty) from a signed-in member's own private profile note.
  const dietaryTouched = useRef(false);
  const [memberUid, setMemberUid] = useState<string | null>(null);
  const [updateSavedDiet, setUpdateSavedDiet] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uid = memberId ?? (await supabase.auth.getSession()).data.session?.user?.id;
      if (!uid) return;
      if (!cancelled) setMemberUid(uid);
      const { data } = await (supabase as any).rpc("get_profiles_pii", { _ids: [uid] });
      const note = Array.isArray(data) && data[0]?.dietary_requirements ? String(data[0].dietary_requirements).trim() : "";
      if (!cancelled && note && !dietaryTouched.current) setDietary((d) => (d.trim() ? d : note));
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [memberId]);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank-transfer" | "cash-cheque" | "">("");
  const [coverFee, setCoverFee] = useState(true);

  const selectedOption = diningOptions.find((o) => o.id === diningOptionId) || diningOptions[0];
  const seatPricePence = selectedOption?.price_pence ?? 0;

  const updateGuestCount = (n: number) => {
    setGuestCount(n);
    setGuests((prev) => {
      if (n > prev.length)
        return [...prev, ...Array.from({ length: n - prev.length }, () => ({ name: "", lodge: "" }))];
      return prev.slice(0, n);
    });
  };

  const seatsToCharge = meetingOption === "meeting-and-festive-board" ? 1 + guestCount : 0;
  const subtotalPence = seatsToCharge * seatPricePence;
  const feePence = paymentMethod === "card" && coverFee ? calcCardFeePence(subtotalPence) : 0;
  const totalPence = subtotalPence + feePence;
  const fmtGbp = (p: number) => `£${(p / 100).toFixed(2)}`;

  const shortDate = useMemo(
    () => new Date(event.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    [event.event_date]
  );
  const eventLabel = `${event.title} — ${shortDate}`;
  const diningLabel = diningEventLabel(event.event_label);
  const nonMason = isNonMasonTitle(title);
  // Non-Masons can't attend the meeting itself: drop a stale "meeting only" choice.
  useEffect(() => {
    if (nonMason && meetingOption === "meeting-only") setMeetingOption("");
  }, [nonMason, meetingOption]);

  const validateStep1 = (): boolean => {
    // Honeypot check — bots fill hidden fields, humans don't
    if (honeypot) return false;
    if (!title || !firstName.trim() || !lastName.trim() || (lodgeRequired(title) && !lodge.trim()) || !email.trim() || !phone.trim()) {
      toast({ title: "Missing details", description: "Please fill in all required fields.", variant: "destructive" });
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!meetingOption) {
      toast({ title: "Select a meeting option", variant: "destructive" });
      return false;
    }
    if (meetingOption === "meeting-and-festive-board") {
      if (!diningOptionId) {
        toast({ title: "Choose a dining option", variant: "destructive" });
        return false;
      }
      if (guests.some((g) => !g.name.trim())) {
        toast({ title: "Guest details required", description: "Please enter each guest's name.", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const lineItems: BookingLineItem[] = useMemo(() => {
    if (seatsToCharge === 0 || !selectedOption) return [];
    return [{
      label: `${selectedOption.label} — ${shortDate} (per head)`,
      qty: seatsToCharge,
      unit_price_pence: seatPricePence,
    }];
  }, [seatsToCharge, selectedOption, seatPricePence, shortDate]);

  const saveBooking = async (finalStatus: "meeting-only" | "apologies" | "bank-transfer" | "cash-cheque") => {
    // Honeypot guard — silently discard bot submissions
    if (honeypot) { setSubmissionStatus(finalStatus); return; }
    if (!turnstileToken) {
      toast({ title: "Please complete the verification", description: "Tick the box at the bottom to confirm you're human.", variant: "destructive" });
      return;
    }
    setSubmissionStatus("submitting");
    try {
      // Normalise capitalisation at point of entry so records are stored clean.
      const nTitle = normaliseTitle(title);
      const nFirst = normaliseName(firstName);
      const nLast = normaliseName(lastName);
      const nLodge = normaliseName(lodge);
      const nGuests = guests.map((g) => ({
        name: normaliseName(g.name),
        lodge: normaliseName(g.lodge),
      }));
      const { data, error } = await supabase.functions.invoke("save-meeting-response", {
        body: {
          event_key: publishedMeeting?.event_key ?? event.slug,
          event_label: eventLabel,
          meeting_id: publishedMeeting?.id ?? null,
          contact_name: `${nTitle} ${nFirst} ${nLast}`.trim(),
          contact_email: email,
          contact_phone: phone,
          meeting_option: meetingOption,
          details: {
            title: nTitle, firstName: nFirst, lastName: nLast, lodge: nLodge,
            meetingOption, guestCount, guests: nGuests, dietary,
            diningOption: selectedOption?.label,
            unitPricePence: seatPricePence,
            paymentMethod, totalPence,
          },
          turnstileToken,
          website: honeypot,
        },
      });

      if (error || !data?.bookingId) {
        throw new Error(await readFunctionError(error, data, "Failed to save response"));
      }
      setSubmissionStatus(finalStatus);
    } catch (err: unknown) {
      setSubmissionStatus("error");
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not save your response. Please try again.",
        variant: "destructive",
      });
    }
  };

  // The saved note on the member record changes only when he ticks the box.
  const saveDietIfAsked = async () => {
    if (!memberUid || !updateSavedDiet) return;
    const { error } = await supabase.from("profiles")
      .update({ dietary_requirements: dietary.trim().slice(0, 500) || null } as never).eq("id", memberUid);
    if (error) console.error("Could not update saved dietary requirements", error.message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // Silently discard bot submissions
    if (!validateStep1() || !validateStep2()) return;
    await saveDietIfAsked();
    if (meetingOption === "apologies" || meetingOption === "meeting-only") {
      await saveBooking(meetingOption);
      return;
    }
    if (!paymentMethod) {
      toast({ title: "Choose a payment method", variant: "destructive" });
      return;
    }
    if (paymentMethod === "bank-transfer" || paymentMethod === "cash-cheque") {
      await saveBooking(paymentMethod);
      return;
    }
    setShowCheckout(true);
  };

  const isSubmitted =
    submissionStatus === "meeting-only" ||
    submissionStatus === "apologies" ||
    submissionStatus === "bank-transfer" ||
    submissionStatus === "cash-cheque";

  return (
    <>
            {/* ── Confirmation State ── */}
            {isSubmitted ? (
              <motion.div
                initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-card rounded-sm border border-border p-5 sm:p-8 text-center space-y-6"
              >
                {/* bg-navy border border-gold/30 replaces unapproved bg-gold/10 */}
                <div
                  className="w-16 h-16 bg-navy border border-gold/30 rounded-full flex items-center justify-center mx-auto"
                  aria-hidden="true"
                >
                  <CheckCircle className="w-8 h-8 text-gold" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-serif text-foreground">
                    {submissionStatus === "apologies" ? "Apologies Recorded" : "Booking Confirmed"}
                  </h3>
                  <div className="text-muted-foreground font-sans leading-relaxed whitespace-pre-line text-left sm:text-center">
                    {submissionStatus === "meeting-only" && (
                      <p>{`Thank you for booking into our next meeting, we look forward to seeing you.\n\n${so}`}</p>
                    )}
                    {submissionStatus === "apologies" && (
                      <p>{`Sorry to hear that you are unable to attend this meeting, your apologies will be duly recorded with the Secretary. We hope to see you at a future meeting.\n\n${so}`}</p>
                    )}
                    {submissionStatus === "bank-transfer" && (
                      <div className="space-y-4">
                        <p>
                          Thank you for your booking. Please send the full dining amount of{" "}
                          <strong className="text-foreground">{fmtGbp(totalPence)}</strong> to the
                          following bank account:
                        </p>
                        {/* bg-background border border-border replaces unapproved bg-muted/50 */}
                        <div className="bg-background border border-border rounded-sm p-4 text-sm text-foreground space-y-1">
                          <div><span className="text-muted-foreground">Account name:</span> {bd.accountName}</div>
                          <div><span className="text-muted-foreground">Sort code:</span> {bd.sortCode}</div>
                          <div><span className="text-muted-foreground">Account no:</span> {bd.accountNumber}</div>
                          <div><span className="text-muted-foreground">Reference:</span> {paymentReference(bd.referencePattern, lastName)}</div>
                        </div>
                        <p>{`We look forward to seeing you on the night.\n\n${so}`}</p>
                      </div>
                    )}
                    {submissionStatus === "cash-cheque" && (
                      <p>{`Thank you for your booking. Please see the Treasurer on the night to settle your dining fee of ${fmtGbp(totalPence)} by cash or cheque${bd.chequePayee ? ` (cheques payable to "${bd.chequePayee}")` : ""}.\n\nWe look forward to seeing you on the night.\n\n${so}`}</p>
                    )}
                  </div>
                </div>
                <Link
                  to={doneHref}
                  className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px]"
                >
                  {doneLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </motion.div>

            ) : showCheckout ? (
              <div className="bg-card rounded-sm border border-border p-5 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-serif text-foreground">Secure Card Payment</h3>
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="text-sm text-muted-foreground hover:text-foreground underline min-h-[48px]"
                  >
                    Back to form
                  </button>
                </div>
                <p className="text-sm text-muted-foreground font-sans">
                  Total: <strong className="text-foreground">{fmtGbp(totalPence)}</strong>
                  {feePence > 0 && <> (includes {fmtGbp(feePence)} card fee)</>}
                </p>
                <StripeEmbeddedCheckoutPanel
                  event_key={publishedMeeting?.event_key ?? event.slug}
                  meeting_id={publishedMeeting?.id ?? null}
                  event_label={eventLabel}
                  contact_name={`${title} ${firstName} ${lastName}`.replace(/\s+/g, " ").trim()}
                  contact_email={email}
                  contact_phone={phone}
                  cover_fee={coverFee}
                  line_items={lineItems}
                  details={{
                    title, firstName, lastName, lodge,
                    meetingOption, guestCount, guests, dietary,
                    diningOption: selectedOption?.label,
                    unitPricePence: seatPricePence,
                    paymentMethod,
                  }}
                  return_url={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
                  onError={(msg) => toast({ title: "Checkout error", description: msg, variant: "destructive" })}
                />
              </div>

            ) : (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView={shouldReduceMotion ? "static" : "visible"}
                viewport={{ once: true }}
                custom={0.1}
              >
                {/* shadow-lg removed — not a project token */}
                <form
                  ref={formRef}
                  onSubmit={handleSubmit}
                  className="bg-card rounded-sm border border-border p-5 sm:p-8 scroll-mt-24"
                >
                  {/* ── Step Indicator ── */}
                  <div className="flex items-center justify-center gap-2 mb-8" role="tablist" aria-label="Form steps">
                    {[1, 2, 3].map((s) => {
                      const hidePayment = s === 3 && meetingOption !== "meeting-and-festive-board";
                      if (hidePayment) return null;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStep(s)}
                          role="tab"
                          aria-selected={step === s}
                          aria-label={`Step ${s}`}
                          className={`w-8 h-8 rounded-full text-xs font-sans font-semibold transition-colors min-h-[48px] min-w-[48px] ${
                            step === s
                              ? "bg-gold text-navy"
                              : step > s
                              // bg-card border border-border replaces unapproved bg-muted
                              ? "bg-gold/30 text-foreground"
                              : "bg-card border border-border text-muted-foreground"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Step 1 — Your Details ── */}
                  <fieldset className={`min-w-0 w-full ${step === 1 ? "block" : "hidden"}`}>
                    <legend className="text-lg font-serif text-foreground mb-6">Your Details</legend>
                    <div className="space-y-4">

                      {/*
                        HONEYPOT FIELD — Anti-bot protection.
                        Hidden from real users via CSS (not display:none — some bots detect that).
                        Positioned off-screen using absolute positioning so it is invisible
                        but still in the DOM for bots that scrape and fill all inputs.
                        Also sent as "website" and checked server-side in save-meeting-response.
                      */}
                      <div
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          left: "-9999px",
                          width: "1px",
                          height: "1px",
                          overflow: "hidden",
                        }}
                      >
                        <label htmlFor="evf-website">Website (do not fill this in)</label>
                        <input
                          id="evf-website"
                          name="website"
                          type="text"
                          value={honeypot}
                          onChange={(e) => setHoneypot(e.target.value)}
                          tabIndex={-1}
                          autoComplete="off"
                        />
                      </div>

                      <div>
                        <label htmlFor="evf-title" className={labelClass}>
                          Title <span className="text-destructive">*</span>
                        </label>
                        <select
                          id="evf-title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                          className={selectClass}
                        >
                          <option value="">Select title</option>
                          <option value="Bro">Bro</option>
                          <option value="W. Bro">W. Bro</option>
                          <option value="VW. Bro">VW. Bro</option>
                          <option value="RW. Bro">RW. Bro</option>
                          <option value="Mr">Mr</option>
                          <option value="Mrs">Mrs</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="evf-first" className={labelClass}>
                            First Name <span className="text-destructive">*</span>
                          </label>
                          <input
                            id="evf-first"
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label htmlFor="evf-last" className={labelClass}>
                            Last Name <span className="text-destructive">*</span>
                          </label>
                          <input
                            id="evf-last"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="evf-lodge" className={labelClass}>
                          Lodge Name & No. {nonMason ? <span className="text-muted-foreground font-normal normal-case">(optional)</span> : <span className="text-destructive">*</span>}
                        </label>
                        <input
                          id="evf-lodge"
                          type="text"
                          value={lodge}
                          onChange={(e) => setLodge(e.target.value)}
                          required={!nonMason}
                          className={inputClass}
                          placeholder={lodgePlaceholder(bd)}
                        />
                      </div>
                      <div>
                        <label htmlFor="evf-email" className={labelClass}>
                          Email <span className="text-destructive">*</span>
                        </label>
                        <input
                          id="evf-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className={inputClass}
                          placeholder="you@example.com"
                        />
                      </div>
                      <div>
                        <label htmlFor="evf-phone" className={labelClass}>
                          Mobile Phone <span className="text-destructive">*</span>
                        </label>
                        <input
                          id="evf-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          className={inputClass}
                          placeholder="07xxx xxx xxx"
                        />
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                      <button
                        type="button"
                        onClick={() => { if (validateStep1()) setStep(2); }}
                        className="bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px]"
                      >
                        Next
                      </button>
                    </div>
                  </fieldset>

                  {/* ── Step 2 — Meeting Options ── */}
                  <fieldset className={`min-w-0 w-full ${step === 2 ? "block" : "hidden"}`}>
                    <legend className="text-lg font-serif text-foreground mb-6">Meeting Options</legend>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="evf-meeting" className={labelClass}>
                          Meeting Options <span className="text-destructive">*</span>
                        </label>
                        <select
                          id="evf-meeting"
                          value={meetingOption}
                          onChange={(e) => setMeetingOption(e.target.value as typeof meetingOption)}
                          required
                          className={selectClass}
                        >
                          <option value="">Select option</option>
                          {attendanceOptions(title, diningLabel).filter((o) => o.value !== "apologies").map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                          <option value="apologies">Not Attending (Apologies for absence)</option>
                        </select>
                      </div>

                      {meetingOption === "meeting-and-festive-board" && (
                        <>
                          {diningOptions.length > 1 && (
                            <div>
                              <label htmlFor="evf-dining" className={labelClass}>
                                Dining Option <span className="text-destructive">*</span>
                              </label>
                              <select
                                id="evf-dining"
                                value={diningOptionId}
                                onChange={(e) => setDiningOptionId(e.target.value)}
                                required
                                className={selectClass}
                              >
                                {diningOptions.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.label} — {fmtGbp(o.price_pence)} per head
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div>
                            <label htmlFor="evf-guests" className={labelClass}>
                              Are You Bringing Any Guests? <span className="text-destructive">*</span>
                            </label>
                            <select
                              id="evf-guests"
                              value={String(guestCount)}
                              onChange={(e) => updateGuestCount(parseInt(e.target.value, 10))}
                              required
                              className={selectClass}
                            >
                              <option value="0">Just Myself</option>
                              <option value="1">1 Guest</option>
                              <option value="2">2 Guests</option>
                              <option value="3">3 Guests</option>
                              <option value="4">4 Guests</option>
                            </select>
                          </div>
                          {guests.map((g, i) => (
                            <div key={i} className="border-t border-border pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label htmlFor={`g${i}`} className={labelClass}>
                                  Guest {i + 1} Name <span className="text-destructive">*</span>
                                </label>
                                <input
                                  id={`g${i}`}
                                  type="text"
                                  value={g.name}
                                  onChange={(e) => setGuests((prev) => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                  required
                                  className={inputClass}
                                  placeholder={`Guest ${i + 1} full name`}
                                />
                              </div>
                              <div>
                                <label htmlFor={`gl${i}`} className={labelClass}>
                                  Guest {i + 1} Lodge Name &amp; No. <span className="text-muted-foreground font-normal normal-case">(optional)</span>
                                </label>
                                <input
                                  id={`gl${i}`}
                                  type="text"
                                  value={g.lodge}
                                  onChange={(e) => setGuests((prev) => prev.map((x, j) => j === i ? { ...x, lodge: e.target.value } : x))}
                                  className={inputClass}
                                  placeholder={lodgePlaceholder(bd)}
                                />
                              </div>
                            </div>
                          ))}
                          <div className="border-t border-border pt-4">
                            <label htmlFor="evf-dietary" className={labelClass}>
                              Allergy / Dietary Requirements
                            </label>
                            <textarea
                              id="evf-dietary"
                              rows={3}
                              value={dietary}
                              onChange={(e) => { dietaryTouched.current = true; setDietary(e.target.value); }}
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              placeholder="Please note any dietary allergies or requirements for yourself or guests"
                            />
                            {memberUid && (
                              <label className="mt-2 flex min-h-[44px] items-center gap-3 font-sans text-sm text-foreground cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={updateSavedDiet}
                                  onChange={(e) => setUpdateSavedDiet(e.target.checked)}
                                  className="h-5 w-5 accent-navy"
                                />
                                Update my saved requirements
                              </label>
                            )}
                          </div>
                          {/* bg-background replaces unapproved bg-warm-white */}
                          <div className="bg-background border border-border rounded-sm p-4 flex items-center justify-between">
                            <span className="font-sans text-sm text-foreground">
                              Subtotal ({seatsToCharge} × {fmtGbp(seatPricePence)})
                            </span>
                            <span className="font-sans font-semibold text-foreground">
                              {fmtGbp(subtotalPence)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="mt-6 flex justify-center w-full min-w-0">
                      <div className="turnstile-shell">
                        <TurnstileWidget onToken={setTurnstileToken} onExpire={() => setTurnstileToken("")} />
                      </div>
                    </div>
                    <div className="mt-8 flex justify-between">

                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="border border-border text-foreground px-6 py-3 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold-dark transition-colors min-h-[48px]"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={submissionStatus === "submitting"}
                        onClick={() => {
                          if (submissionStatus === "submitting") return;
                          if (!validateStep2()) return;
                          if (meetingOption === "meeting-and-festive-board") {
                            setStep(3);
                          } else {
                            saveBooking(meetingOption as "meeting-only" | "apologies");
                          }
                        }}
                        className="bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px]"
                      >
                        {submissionStatus === "submitting" ? "Submitting…" : "Next"}
                      </button>
                    </div>
                  </fieldset>

                  {/* ── Step 3 — Payment ── */}
                  <fieldset className={`min-w-0 w-full ${step === 3 ? "block" : "hidden"}`}>
                    <legend className="text-lg font-serif text-foreground mb-6">Payment</legend>
                    <div className="space-y-4">
                      <div>
                        <p className={labelClass}>
                          Payment Method <span className="text-destructive">*</span>
                        </p>
                        <div className="space-y-2 mt-1" role="radiogroup" aria-label="Payment method">
                          <label className="flex items-start gap-3 cursor-pointer min-h-[48px] py-1">
                            <input
                              type="radio"
                              name="pay"
                              value="card"
                              checked={paymentMethod === "card"}
                              onChange={() => setPaymentMethod("card")}
                              className="mt-1 accent-[hsl(var(--gold))]"
                            />
                            <span className="text-sm font-sans text-foreground">
                              {bd.cardWording || "Debit / Credit card payment (Preferred — pay securely below)"}
                            </span>
                          </label>
                          <label className="flex items-start gap-3 cursor-pointer min-h-[48px] py-1">
                            <input
                              type="radio"
                              name="pay"
                              value="bank-transfer"
                              checked={paymentMethod === "bank-transfer"}
                              onChange={() => setPaymentMethod("bank-transfer")}
                              className="mt-1 accent-[hsl(var(--gold))]"
                            />
                            <span className="text-sm font-sans text-foreground">
                              Bank Transfer
                              <br />
                              <span className="text-muted-foreground text-xs">
                                Sort code: {bd.sortCode} · Account: {bd.accountNumber} · Ref: {paymentReference(bd.referencePattern, "")}
                              </span>
                            </span>
                          </label>
                          <label className="flex items-start gap-3 cursor-pointer min-h-[48px] py-1">
                            <input
                              type="radio"
                              name="pay"
                              value="cash-cheque"
                              checked={paymentMethod === "cash-cheque"}
                              onChange={() => setPaymentMethod("cash-cheque")}
                              className="mt-1 accent-[hsl(var(--gold))]"
                            />
                            <span className="text-sm font-sans text-foreground">
                              Cash / Cheque on night (Please see Treasurer on arrival)
                            </span>
                          </label>
                        </div>
                      </div>

                      {paymentMethod === "card" && seatsToCharge > 0 && (
                        <div className="border-t border-border pt-4 space-y-3">
                          <p className={labelClass}>Cover the Stripe card processing fee?</p>
                          <div className="space-y-2 mt-1" role="radiogroup" aria-label="Card fee preference">
                            <label className="flex items-center gap-3 cursor-pointer min-h-[48px]">
                              <input
                                type="radio"
                                name="fee"
                                checked={coverFee}
                                onChange={() => setCoverFee(true)}
                                className="accent-[hsl(var(--gold))]"
                              />
                              <span className="text-sm font-sans text-foreground">
                                Yes — add {fmtGbp(calcCardFeePence(subtotalPence))} to my total
                              </span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer min-h-[48px]">
                              <input
                                type="radio"
                                name="fee"
                                checked={!coverFee}
                                onChange={() => setCoverFee(false)}
                                className="accent-[hsl(var(--gold))]"
                              />
                              <span className="text-sm font-sans text-foreground">
                                No — the Lodge will cover it
                              </span>
                            </label>
                          </div>

                          {/* bg-background replaces unapproved bg-warm-white */}
                          <div className="bg-background border border-border rounded-sm p-4 space-y-1">
                            <div className="flex justify-between text-sm font-sans">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span className="text-foreground">{fmtGbp(subtotalPence)}</span>
                            </div>
                            {feePence > 0 && (
                              <div className="flex justify-between text-sm font-sans">
                                <span className="text-muted-foreground">Card fee</span>
                                <span className="text-foreground">{fmtGbp(feePence)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-base font-sans font-semibold border-t border-border pt-2 mt-2">
                              <span className="text-foreground">Total</span>
                              {/* text-gold replaces unapproved text-gold-dark */}
                              <span className="text-gold-dark">{fmtGbp(totalPence)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-8 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="border border-border text-foreground px-6 py-3 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold-dark transition-colors min-h-[48px]"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={submissionStatus === "submitting"}
                        className="bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px]"
                      >
                        {submissionStatus === "submitting"
                          ? "Submitting…"
                          : paymentMethod === "card" && seatsToCharge > 0
                          ? "Continue to Payment"
                          : "Submit Booking"}
                      </button>
                    </div>
                  </fieldset>
                </form>
              </motion.div>
            )}
    </>
  );
}
