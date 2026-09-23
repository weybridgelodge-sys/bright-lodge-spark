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
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay } from "date-fns";
import { useEvents, typeLabel, typeBadgeClass } from "@/data/events";
// TODO: audit typeBadgeClass in @/data/events to confirm it uses only
// project theme tokens (navy, gold, background, card, border, foreground, muted-foreground).
// Any Tailwind colour scales found there should be replaced with project tokens.


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
  const { events, loading: eventsLoading } = useEvents();
  const eventDates = useMemo(() => events.map((e) => e.date), [events]);

  const eventsForDate = selectedDate
    ? events.filter((e) => isSameDay(e.date, selectedDate))
    : [];

  const upcomingEvents = useMemo(
    () =>
      [...events]
        .filter((e) => e.date >= new Date())
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [events]
  );

  const schemas = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://weybridgelodge.org.uk/events#webpage",
        url: "https://weybridgelodge.org.uk/events",
        name: "Events & Meetings | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "View upcoming Freemasons meetings, Officers Nights and Lodge of Instruction evenings at Weybridge Lodge No. 6787, Guildford Masonic Centre, GU2 4DR.",
        inLanguage: "en-GB",
        isPartOf: { "@id": "https://weybridgelodge.org.uk/#website" },
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
    ],
    [events]
  );

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Events & Meetings | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787"
        description="View upcoming Freemasons meetings, Officers Nights and Lodge of Instruction evenings at Weybridge Lodge No. 6787, Guildford Masonic Centre, GU2 4DR."
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
                <ul className="space-y-6 list-none p-0 m-0" aria-busy={eventsLoading}>
                  {eventsLoading && Array.from({ length: 3 }).map((_, i) => (
                    <li key={`sk-${i}`} aria-hidden="true" className="border border-border rounded-sm bg-card p-6 animate-pulse space-y-3">
                      <div className="h-3 w-24 bg-muted rounded" />
                      <div className="h-5 w-2/3 bg-muted rounded" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                    </li>
                  ))}
                  {!eventsLoading && upcomingEvents.map((ev, i) => (
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
                        <div className="bg-gold-shimmer text-accent-foreground px-4 py-1 text-xs font-sans font-semibold uppercase tracking-widest">
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

        {/* ── Lodge of Instruction ── */}
        <section
  id="loi"
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

                <a
                  href="mailto:secretary@weybridgelodge.org.uk?subject=Lodge%20of%20Instruction"
                  aria-label="Email to find out more about the Lodge of Instruction at Weybridge Lodge"
                  className="flex w-full items-center justify-center bg-gold-shimmer text-accent-foreground py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity mt-4 min-h-[48px]"
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
                  className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
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
