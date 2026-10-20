import { attendanceOptions, diningEventLabel, isNonMasonTitle, lodgeRequired } from "@/lib/bookingTitles";
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
import { fetchNextEvent, type EventBundle } from "@/lib/lodgeEvents";
import { normaliseName, normaliseTitle } from "@/lib/nameCase";
import TurnstileWidget from "@/components/TurnstileWidget";
import { assetUrl } from "@/lib/assetUrl";
import { readFunctionError } from "@/lib/functionError";
import sixFellowcraftsAprons from "@/assets/six-fellowcrafts-aprons.png.asset.json";



import MeetingBookingForm, { useDiningOption } from "@/components/bookings/MeetingBookingForm";
import SaveTheDate from "@/components/bookings/SaveTheDate";
import { fetchUpcomingRegisterMeetings, type RegisterMeeting } from "@/lib/lodgeEvents";


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
// Card processing fee charged to the payer when they opt in: 2% of the
// subtotal plus a flat 20p (covers Stripe fees and the Lodge environmental levy).
export function calcCardFeePence(subtotalPence: number): number {
  return subtotalPence > 0 ? Math.ceil(subtotalPence * 0.02) + 20 : 0;
}

const labelClass = "block text-sm font-sans font-medium text-foreground mb-1";

// ─── Loader: decides between bookable page and Save the Date ─────────────────
const Bookings = () => {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "bookable"; bundle: EventBundle; publishedMeeting: { id: string; event_key: string } | null }
    | { kind: "save-the-date"; meetings: RegisterMeeting[] }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const b = await fetchNextEvent();
      if (cancelled) return;
      if (b) {
        const { data } = await (supabase.rpc as any)("get_published_meeting_for_event", {
          _event_key: b.event.slug,
        });
        const row = Array.isArray(data) ? data[0] : null;
        if (!cancelled) {
          setState({
            kind: "bookable",
            bundle: b,
            publishedMeeting: row ? { id: row.id, event_key: row.event_key } : null,
          });
        }
        return;
      }
      const meetings = await fetchUpcomingRegisterMeetings();
      if (!cancelled) setState({ kind: "save-the-date", meetings });
    })();
    return () => { cancelled = true; };
  }, []);

  if (state.kind === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-gold animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading meeting details…</span>
      </div>
    );
  }

  if (state.kind === "save-the-date") return <SaveTheDate meetings={state.meetings} />;

  return <BookingsEvent bundle={state.bundle} publishedMeeting={state.publishedMeeting} />;
};

// ─── Bookable meeting page ───────────────────────────────────────────────────
const BookingsEvent = ({
  bundle,
  publishedMeeting,
}: {
  bundle: EventBundle;
  publishedMeeting: { id: string; event_key: string } | null;
}) => {
  const { toast } = useToast();
  const shouldReduceMotion = useReducedMotion();


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

  const [diningOptionId, setDiningOptionId] = useDiningOption(diningOptions);
  const selectedOption = diningOptions.find((o) => o.id === diningOptionId) || diningOptions[0];
  const seatPricePence = selectedOption?.price_pence ?? 0;
  const fmtGbp = (p: number) => `£${(p / 100).toFixed(2)}`;
  const diningLabel = diningEventLabel(event.event_label);

  // Per-meeting header image (private bucket → signed URL); falls back to the
  // generic Fellow Craft photo when this meeting has no custom image.
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const path = (event as any).header_image_url as string | null | undefined;
    if (!path) { setHeaderImageUrl(null); return; }
    (async () => {
      const { data } = await supabase.functions.invoke("event-header-image", { body: { path } });
      if (!cancelled) setHeaderImageUrl((data as { signedUrl?: string } | null)?.signedUrl ?? null);
    })();
    return () => { cancelled = true; };
  }, [event]);
useEffect(() => {
  window.scrollTo(0, 0);
}, []);
  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Dining & Bookings | Weybridge Lodge No. 6787 — Guildford Masonic Centre"
        description={`Book your place at the next Weybridge Lodge meeting at the Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford GU2 4DR. View the ${diningLabel.toLowerCase()} menu and reserve your seat.`}
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
              {introParagraphs.map((p, i) => (
                <p key={i} className="text-muted-foreground font-sans leading-relaxed mb-4 last:mb-0">
                  {renderParagraph(p)}
                </p>
              ))}

            </motion.div>
            <motion.img
              src={headerImageUrl || assetUrl(sixFellowcraftsAprons)}
              alt={headerImageUrl ? event.title : "Six Fellow Craft Masons in white aprons with blue rosettes, standing in a lodge room"}
              loading="lazy"
              className="w-full h-auto rounded-sm mt-6"
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={1}
            />
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
                    <p className="text-primary-foreground/80 font-sans text-sm">{detail.value}</p>
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
                  {diningLabel} Menu
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
                    <p className="text-gold-dark text-xs font-sans uppercase tracking-widest mb-1">
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
                  <p className="text-gold-dark font-serif text-lg">
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
              <p className="text-primary-foreground/80 font-sans text-sm leading-relaxed mb-2">
                Please complete the form below for yourself and any guests. Pay securely by Debit
                or Credit Card, or by bank transfer.
              </p>
              {event.booking_deadline && (
                <p className="text-gold font-sans text-sm font-semibold">
                  ALL BOOKINGS MUST BE RECEIVED BY {fmtDeadline(event.booking_deadline).toUpperCase()}.
                </p>
              )}
              {/* text-gold/60 replaces unapproved text-primary-foreground/60 */}
              <p className="text-primary-foreground/80 font-sans text-xs mt-2">
                Queries? Email{" "}
                <a
                  href="mailto:assistantsecretary@weybridgelodge.org.uk"
                  // hover:text-gold/80 replaces unapproved hover:text-gold-light
                  className="text-gold hover:text-gold/80 transition-colors underline underline-offset-4"
                >
                  assistantsecretary@weybridgelodge.org.uk
                </a>
              </p>
            </motion.div>

            <MeetingBookingForm bundle={bundle} publishedMeeting={publishedMeeting} diningOptionId={diningOptionId} setDiningOptionId={setDiningOptionId} />
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
              className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold-dark transition-colors min-h-[48px]"
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
