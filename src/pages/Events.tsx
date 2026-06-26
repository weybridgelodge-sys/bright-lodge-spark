import { useState, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema, eventSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Calendar as CalendarIcon, MapPin, Clock, Ticket,
  ArrowRight, Users, Music, Gift, UtensilsCrossed,
} from "lucide-react";
import ladiesFestivalImg from "@/assets/events/ladies-festival-venue.jpg";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay } from "date-fns";
import { events, typeLabel, typeBadgeClass } from "@/data/events";
// TODO: audit typeBadgeClass in @/data/events to confirm it uses only
// project theme tokens (navy, gold, background, card, border, foreground, muted-foreground).
// Any Tailwind colour scales found there should be replaced with project tokens.

// ─── Derived data ─────────────────────────────────────────────────────────────
const eventDates = events.map((e) => e.date);

// ─── Ladies Festival schema ───────────────────────────────────────────────────
const ladiesFestivalSchema = {
  "@context": "https://schema.org",
  "@type": "SocialEvent",
  name: "Weybridge & Astolat Lodges Ladies Festival 2026",
  startDate: "2026-08-22T18:30:00+01:00",
  endDate: "2026-08-23T01:00:00+01:00",
  description:
    "Black tie charity gala dinner in aid of Action for Carers Surrey. Three-course dinner, DJ, Grand Raffle and more at the Macdonald Frimley Hall Hotel.",
  image: "https://www.weybridgelodge.org.uk/og-image.png",
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: {
    "@type": "Place",
    name: "Macdonald Frimley Hall Hotel",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Lime Avenue, Frimley",
      addressLocality: "Camberley",
      addressRegion: "Surrey",
      postalCode: "GU15 2BG",
      addressCountry: "GB",
    },
  },
  organizer: {
    "@type": "Organization",
    name: "Weybridge Lodge No. 6787",
    url: "https://www.weybridgelodge.org.uk",
  },
  offers: {
    "@type": "Offer",
    price: "75",
    priceCurrency: "GBP",
    availability: "https://schema.org/InStock",
    url: "https://www.weybridgelodge.org.uk/events",
  },
};

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay },
  }),
  static: { opacity: 1, y: 0 },
};

// ─── Component ────────────────────────────────────────────────────────────────
const Events = () => {
  const shouldReduceMotion = useReducedMotion();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const eventsForDate = selectedDate
    ? events.filter((e) => isSameDay(e.date, selectedDate))
    : [];

  const upcomingEvents = useMemo(
    () =>
      [...events]
        .filter((e) => e.date >= new Date())
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    []
  );

  const schemas = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://www.weybridgelodge.org.uk/events#webpage",
        url: "https://www.weybridgelodge.org.uk/events",
        name: "Events & Meetings | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "View upcoming Freemasons meetings, the 2026 Ladies Festival black tie gala, and weekly Lodge of Instruction evenings at Weybridge Lodge No. 6787, Guildford Masonic Centre, GU2 4DR.",
        inLanguage: "en-GB",
        isPartOf: { "@id": "https://www.weybridgelodge.org.uk/#website" },
      },
      breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Events", url: "/events" },
      ]),
      ...events
        .filter((e) => e.title !== "Weybridge & Astolat Lodges Ladies Festival")
        .map((e) =>
          eventSchema({
            name: e.title,
            date: e.date.toISOString().split("T")[0],
            description: e.description || e.title,
          })
        ),
      ladiesFestivalSchema,
    ],
    []
  );

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Events & Meetings | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787"
        description="View upcoming Freemasons meetings, the 2026 Ladies Festival black tie gala, and weekly Lodge of Instruction evenings at Weybridge Lodge No. 6787, Guildford Masonic Centre, GU2 4DR."
        canonical="/events"
        type="website"
        schema={schemas}
      />
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />

      <main id="main-content">

        {/* ── H1 — geo-anchored ── */}
        <PageHeader
          title="Events & Meetings at Weybridge Lodge — Guildford Masonic Centre"
          subtitle="Masonic meetings, social events and Lodge of Instruction in Guildford, Surrey"
        />

        {/* ── Calendar + Upcoming Events ── */}
        {/* bg-background replaces unapproved bg-warm-white */}
        <section
          className="py-16 md:py-24 bg-background"
          aria-labelledby="events-calendar-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="flex flex-col lg:flex-row gap-10">

              {/* Calendar sidebar */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView={shouldReduceMotion ? "static" : "visible"}
                viewport={{ once: true }}
                custom={0}
                className="lg:w-[340px] shrink-0"
              >
                <h2
                  id="events-calendar-heading"
                  className="text-2xl font-serif text-foreground mb-4"
                >
                  Event Calendar
                </h2>
                {/* shadow-sm removed — not a project token */}
                <div className="border border-border rounded-sm bg-card p-4">
                  <Calendar
                    mode="single"
                    showOutsideDays={false}
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="p-3 pointer-events-auto"
                    modifiers={{ event: eventDates }}
                    modifiersClassNames={{
                      // bg-gold text-navy replaces unapproved bg-accent text-accent-foreground
                      event: "bg-gold text-navy font-bold ring-2 ring-gold rounded-full",
                    }}
                  />
                  {selectedDate && (
                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-sm font-sans font-medium text-foreground mb-2">
                        {format(selectedDate, "EEEE d MMMM yyyy")}
                      </p>
                      {eventsForDate.length === 0 ? (
                        <p className="text-sm text-muted-foreground font-sans">
                          No events on this date.
                        </p>
                      ) : (
                        <ul className="space-y-2 list-none p-0 m-0">
                          {eventsForDate.map((ev) => (
                            // key on title+date string — stable, not index
                            <li
                              key={`${ev.title}-${ev.date.toISOString()}`}
                              className="text-sm font-sans"
                            >
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs mr-2 ${typeBadgeClass[ev.type]}`}
                              >
                                {typeLabel[ev.type]}
                              </span>
                              {ev.title}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Upcoming events list */}
              <div className="flex-1">
                <h2 className="text-2xl font-serif text-foreground mb-6">
                  Upcoming Events
                </h2>
                <ul className="space-y-6 list-none p-0 m-0">
                  {upcomingEvents.map((ev, i) => (
                    <motion.li
                      // key on title+date — stable if event order changes
                      key={`${ev.title}-${ev.date.toISOString()}`}
                      variants={fadeUp}
                      initial="hidden"
                      whileInView={shouldReduceMotion ? "static" : "visible"}
                      viewport={{ once: true }}
                      custom={i * 0.08}
                      // border-gold/40 replaces unapproved border-accent on highlighted events
                      // shadow-sm removed — not a project token
                      className={`border rounded-sm bg-card overflow-hidden ${
                        ev.highlight ? "border-gold/40" : "border-border"
                      }`}
                    >
                      {ev.highlight && (
                        // bg-gold text-navy replaces unapproved bg-gold-shimmer text-accent-foreground
                        <div className="bg-gold text-navy px-4 py-1 text-xs font-sans font-semibold uppercase tracking-widest">
                          Featured Event
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs mb-2 ${typeBadgeClass[ev.type]}`}
                            >
                              {typeLabel[ev.type]}
                            </span>
                            <h3 className="text-xl font-serif text-foreground">{ev.title}</h3>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground font-sans">
                          <span className="inline-flex items-center gap-1.5">
                            {/* text-gold replaces unapproved text-gold-dark */}
                            <CalendarIcon className="w-4 h-4 text-gold" aria-hidden="true" />
                            {format(ev.date, "EEEE d MMMM yyyy")}
                          </span>
                          {ev.time && (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-gold" aria-hidden="true" />
                              {ev.time}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-gold" aria-hidden="true" />
                            {ev.venue}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="mt-3 text-sm text-muted-foreground font-sans leading-relaxed">
                            {ev.description}
                          </p>
                        )}
                        {ev.link && (
                          // ArrowRight replaces ExternalLink — these are internal routes,
                          // not external URLs. ExternalLink is semantically incorrect here.
                          <Link
                            to={ev.link}
                            className="inline-flex items-center gap-1.5 mt-4 text-sm font-sans font-medium text-gold hover:opacity-80 transition-opacity min-h-[48px]"
                          >
                            View Full Details
                            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Ladies Festival Feature ── */}
        <section
          className="py-16 md:py-24 bg-card border-t border-border"
          aria-labelledby="ladies-festival-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={0}
            >
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2
                id="ladies-festival-heading"
                className="text-3xl md:text-4xl font-serif text-foreground text-center mb-2"
              >
                Ladies Festival 2026
              </h2>
              <p className="text-center text-muted-foreground font-sans mb-10">
                Weybridge &amp; Astolat Lodges
              </p>
            </motion.div>

            {/* shadow-lg removed — not a project token */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={0.2}
              className="border border-border rounded-sm overflow-hidden"
            >
              <div className="relative">
                <img
                  src={ladiesFestivalImg}
                  alt="Elegant black-tie gala dinner venue with round tables and chandeliers — Ladies Festival 2026 by Weybridge and Astolat Lodges"
                  width={1600}
                  height={900}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-56 md:h-72 object-cover"
                />
                {/* from-navy/90 to-navy/40 replaces unapproved hsl(var(--primary)) gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-navy/90 to-navy/40" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                  {/* text-gold replaces unapproved text-gold-dark */}
                  <p className="text-gold uppercase tracking-widest text-sm font-sans mb-2">
                    Black Tie
                  </p>
                  {/* text-gold replaces unapproved text-primary-foreground */}
                  <p className="text-3xl md:text-4xl font-serif text-gold">
                    Saturday 22nd August 2026
                  </p>
                  {/* text-gold/60 replaces unapproved text-primary-foreground/60 */}
                  <p className="text-gold/60 font-sans text-sm mt-2">6.30 pm – 1.00 am</p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-sans font-medium text-foreground">
                      Macdonald Frimley Hall Hotel
                    </p>
                    <p className="text-sm text-muted-foreground font-sans">
                      Lime Avenue, Frimley, Camberley GU15 2BG
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Ticket className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-sans font-medium text-foreground">Tickets: £75 per person</p>
                    <p className="text-sm text-muted-foreground font-sans">
                      Three-course dinner included
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <UtensilsCrossed className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-sans font-medium text-foreground">Three-Course Dinner</p>
                    {/* bg-background replaces unapproved bg-muted/50 */}
                    <div className="mt-2 bg-background border border-border rounded-sm p-4 text-sm text-muted-foreground font-sans space-y-2">
                      <p className="font-medium text-foreground">Menu</p>
                      <p>
                        <span className="text-gold font-medium">Starter:</span> To be confirmed
                      </p>
                      <p>
                        <span className="text-gold font-medium">Main:</span> To be confirmed
                      </p>
                      <p>
                        <span className="text-gold font-medium">Dessert:</span> To be confirmed
                      </p>
                      <p className="text-xs italic mt-2">
                        Full menu details coming soon. Dietary requirements will be catered for —
                        please advise when booking.
                      </p>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-serif text-foreground pt-2">The Evening Includes</h3>
                <ul className="grid sm:grid-cols-2 gap-3 text-sm font-sans text-muted-foreground list-none p-0 m-0">
                  <li className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-gold shrink-0" aria-hidden="true" />
                    DJ &amp; dancing
                  </li>
                  <li className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-gold shrink-0" aria-hidden="true" />
                    Charity Grand Raffle
                  </li>
                  <li className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-gold shrink-0" aria-hidden="true" />
                    Fun Casino
                  </li>
                </ul>

                {/* bg-background replaces unapproved bg-muted/30 */}
                <div className="mt-6 bg-background border border-border rounded-sm p-6">
                  <h3 className="text-lg font-serif text-foreground mb-3">
                    In Aid of Action for Carers Surrey
                  </h3>
                  <p className="text-sm font-sans text-muted-foreground leading-relaxed mb-3">
                    Action for Carers Surrey is the county's leading charity supporting unpaid carers
                    of all ages — from young carers as young as five through to adults looking after
                    family members, friends or neighbours. Their services provide vital information,
                    advice, advocacy and respite, helping carers across Surrey to maintain their own
                    health, wellbeing and independence.
                  </p>
                  <p className="text-sm font-sans text-muted-foreground leading-relaxed mb-4">
                    By attending the Ladies Festival, you will be directly contributing to the work
                    of this remarkable charity, supporting carers right here in our local community.
                  </p>
                  <a
                    href="https://www.actionforcarers.org.uk/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Learn more about Action for Carers Surrey (opens in new tab)"
                    className="inline-flex items-center gap-2 text-sm font-sans font-medium text-gold hover:opacity-80 transition-opacity min-h-[48px]"
                  >
                    Learn more about Action for Carers Surrey
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </a>
                </div>

                {/* bg-gold text-navy replaces unapproved bg-gold-shimmer text-accent-foreground */}
                <a
                  href="mailto:secretary@astolat.org?subject=Ladies%20Festival%202026"
                  aria-label="Enquire about tickets for the Ladies Festival 2026"
                  className="flex w-full items-center justify-center bg-gold text-navy py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity mt-4 min-h-[48px]"
                >
                  Enquire About Tickets
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Lodge of Instruction ── */}
        <section
          className="py-16 md:py-24 bg-background border-t border-border"
          aria-labelledby="loi-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={0}
              className="text-center"
            >
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2
                id="loi-heading"
                className="text-3xl md:text-4xl font-serif text-foreground mb-4"
              >
                Lodge of Instruction
              </h2>
              <p className="text-muted-foreground font-sans mb-10 max-w-xl mx-auto">
                Sharpen your ritual and enjoy the fellowship of Brethren from across the Province
                of Surrey.
              </p>
            </motion.div>

            {/* shadow-sm removed — not a project token */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={0.2}
              className="max-w-2xl mx-auto border border-border rounded-sm bg-card overflow-hidden"
            >
              {/* bg-navy flat: bg-navy-gradient is not a project token */}
              <div className="bg-navy p-8 text-center">
                {/* text-gold replaces unapproved text-gold-dark */}
                <p className="text-gold uppercase tracking-widest text-sm font-sans mb-2">
                  Weekly Sessions
                </p>
                {/* text-gold replaces unapproved text-primary-foreground */}
                <p className="text-2xl md:text-3xl font-serif text-gold">
                  Thursday Evenings — 7.30 pm
                </p>
                {/* text-gold/60 replaces unapproved text-primary-foreground/60 */}
                <p className="text-gold/60 font-sans text-sm mt-2">
                  1st Thursday in September to 2nd Thursday in May
                </p>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-sans font-medium text-foreground">
                      Guildford Masonic Centre
                    </p>
                    {/* Address corrected: Weybourne House added — consistent with site-wide canonical address */}
                    <p className="text-sm text-muted-foreground font-sans">
                      Weybourne House, Hitherbury Close, Guildford,{" "}
                      <span className="font-medium text-foreground">GU2 4DR</span>
                    </p>
                  </div>
                </div>

                <p className="text-sm font-sans text-muted-foreground leading-relaxed">
                  Join us at our weekly Lodge of Instruction sessions where we practise the next
                  ceremony in our Masonic diary. Open to all Freemasons from any Lodge in Surrey
                  and beyond.
                </p>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">
                    Open to all Freemasons from any Lodge.
                  </strong>
                </p>

                {/* bg-gold text-navy replaces unapproved bg-gold-shimmer text-accent-foreground */}
                
                  href="mailto:mentor@weybridgelodge.org.uk?subject=Lodge%20of%20Instruction"
                  aria-label="Email to find out more about the Lodge of Instruction at Weybridge Lodge"
                  className="flex w-full items-center justify-center bg-gold text-navy py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity mt-4 min-h-[48px]"
                >
                  Email for Details
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        {/* Previous version: bare section, single button, no heading, no copy — dead end.
            bg-navy flat: bg-navy-gradient is not a project token. */}
        <section
          className="py-16 bg-navy"
          aria-labelledby="events-cta-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={0}
            >
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2
                id="events-cta-heading"
                className="font-serif text-gold text-2xl md:text-3xl mb-3"
              >
                Ready to join us at the table?
              </h2>
              <p className="text-gold/70 font-sans mb-8">
                Reserve your place at the next Weybridge Lodge Festive Board at the Guildford
                Masonic Centre, GU2 4DR — three courses, good company, and a genuine Masonic
                evening in Surrey.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  to="/bookings"
                  aria-label="Book a dining place at the next Weybridge Lodge Festive Board"
                  className="inline-flex items-center justify-center gap-2 bg-gold text-navy px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Book a Dining Place
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/join-us"
                  aria-label="Find out how to join Weybridge Lodge No. 6787 in Guildford"
                  className="inline-flex items-center justify-center bg-transparent text-gold border border-gold/40 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Join the Lodge
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default Events;
