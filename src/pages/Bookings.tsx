import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { eventSchema, breadcrumbSchema } from "@/components/SEO";
import { PaymentTestModeBanner } from "@/components/payments/PaymentTestModeBanner";
import { StripeEmbeddedCheckoutPanel, type BookingLineItem } from "@/components/payments/StripeEmbeddedCheckout";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Calendar, Clock, MapPin, Shirt, CalendarClock,
  UtensilsCrossed, CheckCircle, Loader2, ArrowRight,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { fetchNextEvent, type EventBundle } from "@/lib/lodgeEvents";
import TurnstileWidget from "@/components/TurnstileWidget";


// ─── Fallback event ───────────────────────────────────────────────────────────
// Location corrected: Portsmouth Road removed.
// Correct address: Weybourne House, Hitherbury Close, Guildford GU2 4DR.
const FALLBACK: EventBundle = {
  event: {
    id: "fallback",
    slug: "festive_board_april_2026",
    title: "Initiation Ceremony — April Meeting",
    intro_heading: "Initiation Ceremony — April Meeting",
    intro:
      "W Bro. Julien Tidmarsh, Worshipful Master of Weybridge Lodge No. 6787, cordially invites you to attend an Initiation Meeting on **Wednesday, 15th April 2026, commencing at 6.00 pm**.\n\nFollowing the ceremony, we'll gather for a festive board filled with cheer, good food, and heartfelt fellowship.",
    event_date: "2026-04-15T18:00:00+01:00",
    tyling_time: "Tyling at 6.00 pm prompt",
    dining_time: "Festive Board Dining at 7:45 pm",
    location: "Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford GU2 4DR",
    dress_code: "Normal Masonic attire — Provincial, Black or Craft Tie, Dark Suit and White Gloves",
    booking_deadline: "2026-04-08",
    published: true,
    sort_order: 0,
  },
  courses: [
    { id: "c1", event_id: "fallback", course_label: "Entrée", dish: "Halloumi, Carrot, Orange & Watercress Salad", description: "With honey & mustard dressing.", position: 1 },
    { id: "c2", event_id: "fallback", course_label: "Main", dish: "Irish Stew with Soda Bread", description: "Lamb, smoked bacon, root vegetables, potatoes & pearl barley, slowly cooked.", position: 2 },
    { id: "c3", event_id: "fallback", course_label: "Dessert", dish: "Warm Chocolate Brownie (Gluten-Free)", description: "Served with sauce & ice cream.", position: 3 },
  ],
  diningOptions: [
    { id: "o1", event_id: "fallback", label: "Festive Board (3-course dinner)", price_pence: 3200, position: 1, is_default: true },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtFullDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const fmtDeadline = (d: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";

function renderParagraph(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Guest = { name: string; lodge: string };

// ─── Animation Variants ───────────────────────────────────────────────────────
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

// ─── Shared form class strings ────────────────────────────────────────────────
// border-input and ring-ring are Shadcn CSS variable tokens — retained as-is
// since they control focus rings. TODO: verify these are defined in global CSS.
const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[48px]";
const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[48px]";
const labelClass = "block text-sm font-sans font-medium text-foreground mb-1";

// ─── Component ────────────────────────────────────────────────────────────────
const Bookings = () => {
  const { toast } = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [bundle, setBundle] = useState<EventBundle>(FALLBACK);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [publishedMeeting, setPublishedMeeting] = useState<{ id: string; event_key: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNextEvent().then(async (b) => {
      if (cancelled) return;
      if (b) {
        setBundle(b);
        const { data } = await supabase
          .from("festive_board_meetings")
          .select("id,event_key")
          .eq("event_key", b.event.slug)
          .eq("status", "published")
          .maybeSingle();
        if (!cancelled) setPublishedMeeting(data ?? null);
      } else {
        setPublishedMeeting(null);
      }
      setLoadingEvent(false);
    });
    return () => { cancelled = true; };
  }, []);

  const { event, courses, diningOptions } = bundle;
  const introParagraphs = useMemo(
    () => event.intro.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
    [event.intro]
  );

  const meetingDetails = useMemo(() => [
    { icon: Calendar, label: "Meeting Date", value: fmtFullDate(event.event_date) },
    { icon: Clock, label: "Meeting Times", value: [event.tyling_time, event.dining_time].filter(Boolean).join(", ") },
    { icon: MapPin, label: "Location", value: event.location },
    { icon: Shirt, label: "Dress Code", value: event.dress_code },
    ...(event.booking_deadline
      ? [{ icon: CalendarClock, label: "Booking Deadline", value: fmtDeadline(event.booking_deadline) }]
      : []),
  ], [event]);

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

  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [lodge, setLodge] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Honeypot — must remain empty on legitimate submissions
  const [honeypot, setHoneypot] = useState("");
  const [meetingOption, setMeetingOption] = useState<
    "meeting-and-festive-board" | "meeting-only" | "apologies" | ""
  >("");
  const [guestCount, setGuestCount] = useState<number>(0);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [dietary, setDietary] = useState("");
  const [diningOptionId, setDiningOptionId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank-transfer" | "cash-cheque" | "">("");
  const [coverFee, setCoverFee] = useState(false);

  useEffect(() => {
    if (!diningOptionId && diningOptions.length) {
      const def = diningOptions.find((o) => o.is_default) || diningOptions[0];
      setDiningOptionId(def.id);
    }
  }, [diningOptions, diningOptionId]);

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
  const feePence = paymentMethod === "card" && coverFee ? Math.ceil(subtotalPence * 0.02) : 0;
  const totalPence = subtotalPence + feePence;
  const fmtGbp = (p: number) => `£${(p / 100).toFixed(2)}`;

  const shortDate = useMemo(
    () => new Date(event.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    [event.event_date]
  );
  const eventLabel = `${event.title} — ${shortDate}`;

  const validateStep1 = (): boolean => {
    // Honeypot check — bots fill hidden fields, humans don't
    if (honeypot) return false;
    if (!title || !firstName.trim() || !lastName.trim() || !lodge.trim() || !email.trim() || !phone.trim()) {
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
      if (guests.some((g) => !g.name.trim() || !g.lodge.trim())) {
        toast({ title: "Guest details required", description: "Please enter each guest's name and Lodge name & no.", variant: "destructive" });
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
    // TODO: also check honeypot server-side in save-meeting-response edge function
    // by rejecting any body where details.honeypot is non-empty.
    setSubmissionStatus("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("save-meeting-response", {
        body: {
          event_key: publishedMeeting?.event_key ?? event.slug,
          event_label: eventLabel,
          meeting_id: publishedMeeting?.id ?? null,
          contact_name: `${title} ${firstName} ${lastName}`.trim(),
          contact_email: email,
          contact_phone: phone,
          meeting_option: meetingOption,
          details: {
            title, firstName, lastName, lodge,
            meetingOption, guestCount, guests, dietary,
            diningOption: selectedOption?.label,
            unitPricePence: seatPricePence,
            paymentMethod, totalPence,
          },
          environment: getStripeEnvironment(),
        },
      });
      if (error || !data?.bookingId) throw new Error(error?.message || "Failed to save response");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // Silently discard bot submissions
    if (!validateStep1() || !validateStep2()) return;
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
useEffect(() => {
  window.scrollTo(0, 0);
}, []);
  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Dining & Bookings | Weybridge Lodge No. 6787 — Guildford Masonic Centre"
        description="Book your place at the next Weybridge Lodge meeting at the Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford GU2 4DR. View the festive board menu and reserve your seat."
        canonical="/bookings"
        type="website"
        schema={[
          eventSchema({
            name: event.title,
            date: event.event_date,
            description: introParagraphs[0]?.replace(/\*\*/g, "") || event.title,
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Bookings", url: "/bookings" },
          ]),
        ]}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <PaymentTestModeBanner />
      <Header />

      <main id="main-content">
        <PageHeader
          title="Dining & Bookings"
          subtitle="Reserve your place at the next Weybridge Lodge meeting at the Guildford Masonic Centre, GU2 4DR"
        />

        {/* ── Event Introduction ── */}
        <section
          className="py-20 md:py-28 bg-background"
          aria-labelledby="event-intro-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={0}
            >
              <div className="h-px w-16 bg-gold mb-6" aria-hidden="true" />
              <h2
                id="event-intro-heading"
                className="text-2xl md:text-3xl font-serif text-foreground mb-4"
              >
                {event.intro_heading || event.title}
              </h2>
              {loadingEvent && event.id === "fallback" ? (
                <div className="flex items-center gap-2 text-muted-foreground font-sans text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Loading meeting…
                </div>
              ) : (
                introParagraphs.map((p, i) => (
                  <p key={i} className="text-muted-foreground font-sans leading-relaxed mb-4 last:mb-0">
                    {renderParagraph(p)}
                  </p>
                ))
              )}
            </motion.div>
          </div>
        </section>

        {/* ── Meeting Details ── */}
        {/* bg-navy flat: bg-navy-gradient is not a project token */}
        <section
          className="py-20 md:py-28 bg-navy"
          aria-labelledby="meeting-details-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={0}
              className="text-center mb-12"
            >
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              {/* text-gold replaces unapproved text-primary-foreground */}
              <h2
                id="meeting-details-heading"
                className="text-3xl md:text-4xl font-serif text-gold"
              >
                The Useful Stuff
              </h2>
            </motion.div>
            <ul className="space-y-6 list-none p-0 m-0">
              {meetingDetails.map((detail, i) => (
                <motion.li
                  key={detail.label}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView={shouldReduceMotion ? "static" : "visible"}
                  viewport={{ once: true }}
                  custom={i * 0.08}
                  className="flex items-start gap-4"
                >
                  <detail.icon
                    className="w-5 h-5 text-gold mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    {/* text-gold replaces unapproved text-primary-foreground */}
                    <p className="font-sans font-medium text-gold text-sm">{detail.label}</p>
                    {/* text-gold/70 replaces unapproved text-primary-foreground/70 */}
                    <p className="text-gold/70 font-sans text-sm">{detail.value}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Menu ── */}
        {courses.length > 0 && (
          <section
            className="py-20 md:py-28 bg-background border-t border-border"
            aria-labelledby="menu-heading"
          >
            <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView={shouldReduceMotion ? "static" : "visible"}
                viewport={{ once: true }}
                custom={0}
                className="text-center mb-12"
              >
                <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
                <h2
                  id="menu-heading"
                  className="text-3xl md:text-4xl font-serif text-foreground"
                >
                  {/* aria-hidden on icon: already present, layout unusual but acceptable */}
                  <UtensilsCrossed className="inline w-8 h-8 text-gold mr-3 -mt-1" aria-hidden="true" />
                  Festive Board Menu
                </h2>
              </motion.div>
              <ul className="space-y-6 max-w-xl mx-auto list-none p-0 m-0">
                {courses.map((item, i) => (
                  <motion.li
                    key={item.id}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView={shouldReduceMotion ? "static" : "visible"}
                    viewport={{ once: true }}
                    custom={i * 0.08}
                    className="text-center"
                  >
                    <p className="text-gold text-xs font-sans uppercase tracking-widest mb-1">
                      {item.course_label}
                    </p>
                    <h3 className="text-lg font-serif text-foreground mb-1">{item.dish}</h3>
                    {item.description && (
                      <p className="text-muted-foreground font-sans text-sm">{item.description}</p>
                    )}
                  </motion.li>
                ))}
              </ul>
              {selectedOption && seatPricePence > 0 && (
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  whileInView={shouldReduceMotion ? "static" : "visible"}
                  viewport={{ once: true }}
                  custom={0.2}
                  className="text-center mt-10"
                >
                  <p className="text-gold font-serif text-lg">
                    {selectedOption.label} — {fmtGbp(seatPricePence)} per head
                  </p>
                </motion.div>
              )}
            </div>
          </section>
        )}

        {/* ── Booking Form ── */}
        <section
          className="py-20 md:py-28 bg-navy"
          aria-labelledby="booking-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={0}
              className="text-center mb-8"
            >
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              {/* text-gold replaces unapproved text-primary-foreground */}
              <h2
                id="booking-heading"
                className="text-3xl md:text-4xl font-serif text-gold mb-4"
              >
                Booking Form
              </h2>
              {/* text-gold/70 replaces unapproved text-primary-foreground/70 */}
              <p className="text-gold/70 font-sans text-sm leading-relaxed mb-2">
                Please complete the form below for yourself and any guests. Pay securely by Debit
                or Credit Card, or by bank transfer.
              </p>
              {event.booking_deadline && (
                <p className="text-gold font-sans text-sm font-semibold">
                  ALL BOOKINGS MUST BE RECEIVED BY {fmtDeadline(event.booking_deadline).toUpperCase()}.
                </p>
              )}
              {/* text-gold/60 replaces unapproved text-primary-foreground/60 */}
              <p className="text-gold/60 font-sans text-xs mt-2">
                Queries? Email{" "}
                <a
                  href="mailto:assistantsecretary@weybridgelodge.org.uk"
                  // hover:text-gold/80 replaces unapproved hover:text-gold-light
                  className="text-gold hover:text-gold/80 transition-colors"
                >
                  assistantsecretary@weybridgelodge.org.uk
                </a>
              </p>
            </motion.div>

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
                      <p>{"Thank you for booking into our next meeting, we look forward to seeing you.\n\nSincerely and Fraternally,\nWM Weybridge Lodge 6787"}</p>
                    )}
                    {submissionStatus === "apologies" && (
                      <p>{"Sorry to hear that you are unable to attend this meeting, your apologies will be duly recorded with the Secretary. We hope to see you at a future meeting.\n\nSincerely and Fraternally,\nWM Weybridge Lodge 6787"}</p>
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
                          <div><span className="text-muted-foreground">Account name:</span> Weybridge Lodge No 6787</div>
                          <div><span className="text-muted-foreground">Sort code:</span> 30-99-80</div>
                          <div><span className="text-muted-foreground">Account no:</span> 14878862</div>
                          <div><span className="text-muted-foreground">Reference:</span> Dining + {lastName || "Your Surname"}</div>
                        </div>
                        <p>{"We look forward to seeing you on the night.\n\nSincerely and Fraternally,\nWM Weybridge Lodge 6787"}</p>
                      </div>
                    )}
                    {submissionStatus === "cash-cheque" && (
                      <p>{`Thank you for your booking. Please see the Treasurer on the night to settle your dining fee of ${fmtGbp(totalPence)} by cash or cheque (cheques payable to "Weybridge Lodge No 6787").\n\nWe look forward to seeing you on the night.\n\nSincerely and Fraternally,\nWM Weybridge Lodge 6787`}</p>
                    )}
                  </div>
                </div>
                {/* bg-gold text-navy replaces unapproved bg-gold-shimmer text-accent-foreground */}
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 bg-gold text-navy px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px]"
                >
                  Back to Home
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
                  contact_name={`${title} ${firstName} ${lastName}`.trim()}
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
                  <fieldset className={step === 1 ? "block" : "hidden"}>
                    <legend className="text-lg font-serif text-foreground mb-6">Your Details</legend>
                    <div className="space-y-4">

                      {/*
                        HONEYPOT FIELD — Anti-bot protection.
                        Hidden from real users via CSS (not display:none — some bots detect that).
                        Positioned off-screen using absolute positioning so it is invisible
                        but still in the DOM for bots that scrape and fill all inputs.
                        TODO: also check this field server-side in save-meeting-response
                        edge function — reject any submission where honeypot is non-empty.
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
                          Lodge Name & No. <span className="text-destructive">*</span>
                        </label>
                        <input
                          id="evf-lodge"
                          type="text"
                          value={lodge}
                          onChange={(e) => setLodge(e.target.value)}
                          required
                          className={inputClass}
                          placeholder="e.g. Weybridge Lodge No. 6787"
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
                      {/* bg-gold text-navy replaces unapproved bg-gold-shimmer text-accent-foreground */}
                      <button
                        type="button"
                        onClick={() => { if (validateStep1()) setStep(2); }}
                        className="bg-gold text-navy px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px]"
                      >
                        Next
                      </button>
                    </div>
                  </fieldset>

                  {/* ── Step 2 — Meeting Options ── */}
                  <fieldset className={step === 2 ? "block" : "hidden"}>
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
                          <option value="meeting-and-festive-board">Attending Meeting + Festive Board</option>
                          <option value="meeting-only">Attending Meeting ONLY</option>
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
                                  Guest {i + 1} Lodge Name &amp; No. <span className="text-destructive">*</span>
                                </label>
                                <input
                                  id={`gl${i}`}
                                  type="text"
                                  value={g.lodge}
                                  onChange={(e) => setGuests((prev) => prev.map((x, j) => j === i ? { ...x, lodge: e.target.value } : x))}
                                  required
                                  className={inputClass}
                                  placeholder="e.g. Weybridge Lodge No. 6787"
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
                              onChange={(e) => setDietary(e.target.value)}
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              placeholder="Please note any dietary allergies or requirements for yourself or guests"
                            />
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
                    <div className="mt-8 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="border border-border text-foreground px-6 py-3 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors min-h-[48px]"
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
                        className="bg-gold text-navy px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px]"
                      >
                        {submissionStatus === "submitting" ? "Submitting…" : "Next"}
                      </button>
                    </div>
                  </fieldset>

                  {/* ── Step 3 — Payment ── */}
                  <fieldset className={step === 3 ? "block" : "hidden"}>
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
                              Debit / Credit card payment (Preferred — pay securely below)
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
                                Sort code: 30-99-80 · Account: 14878862 · Ref: Dining+Your Surname
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
                          <p className={labelClass}>Cover the card processing fee (~2%)?</p>
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
                                Yes — add {fmtGbp(Math.ceil(subtotalPence * 0.02))} to my total
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
                              <span className="text-gold">{fmtGbp(totalPence)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-8 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="border border-border text-foreground px-6 py-3 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors min-h-[48px]"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={submissionStatus === "submitting"}
                        className="bg-gold text-navy px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px]"
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
          </div>
        </section>

        {/* ── Footer Link ── */}
        <section
          className="py-16 bg-background border-t border-border"
          aria-label="View all events"
        >
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <Link
              to="/events"
              aria-label="View all upcoming events at Weybridge Lodge No. 6787"
              className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors min-h-[48px]"
            >
              View All Events
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Bookings;
