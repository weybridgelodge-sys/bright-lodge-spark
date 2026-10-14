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
import { useEffect } from "react";
import { fetchPublicEvents, formatEventDate, type PublicEvent } from "@/lib/publicEvents";


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
  const [publicEvents, setPublicEvents] = useState<PublicEvent[]>([]);
  useEffect(() => { fetchPublicEvents().then(setPublicEvents); }, []);
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
          "View upcoming Freemasons meetings, Officers Nights and Rehearsal Nights at Weybridge Lodge No. 6787, Guildford Masonic Centre, GU2 4DR.",
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
        description="View upcoming Freemasons meetings, Officers Nights and Rehearsal Nights at Weybridge Lodge No. 6787, Guildford Masonic Centre, GU2 4DR."
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
          subtitle="Masonic meetings, social events and Rehearsal Nights at Guildford Masonic Centre, GU2 4DR"
        />

        {publicEvents.length > 0 && (
          <section className="pt-16 bg-background" aria-labelledby="public-events-heading">
            <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
              <h2 id="public-events-heading" className="text-2xl font-serif text-foreground mb-4">Upcoming events — book online</h2>
              <ul className="space-y-3">
                {publicEvents.map((pe) => (
                  <li key={pe.id}>
                    <Link to={`/events/${pe.slug}`} className="flex items-center justify-between gap-4 w-full min-h-[64px] border border-border bg-card rounded-sm px-5 py-4 hover:border-gold-dark">
                      <span>
                        <span className="block font-serif text-lg text-foreground">{pe.public_title}</span>
                        <span className="block text-sm font-sans text-muted-foreground">{formatEventDate(pe.event_date)} · Guildford Masonic Centre, GU2 4DR</span>
                      </span>
                      <ArrowRight className="w-5 h-5 text-gold-dark shrink-0" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── Calendar + Upcoming Events ── */}

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
                <div className="border border-border rounded-sm bg-card p-4">
                  <Calendar
                    mode="single"
                    showOutsideDays={false}
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="p-3 pointer-events-auto"
                    modifiers={{ event: eventDates }}
                    modifiersClassNames={{

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
                                className={`inline-block px-2 py-0.5 rounded-full text-sm mr-2 ${typeBadgeClass[ev.type]}`}
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
                  {!eventsLoading && upcomingEvents.length === 0 && (
                    <li className="border border-border bg-card rounded-sm p-6">
                      <h3 className="font-serif text-xl text-foreground mb-3">No upcoming events listed right now</h3>
                      <p className="font-sans text-muted-foreground leading-relaxed mb-6">New dates are added as soon as they are confirmed. If you are thinking of joining, you do not need to wait for an event: start with the 2-minute quiz or get in touch.</p>
                      <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                        <Link to="/quiz" className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-6 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest min-h-[48px] w-full sm:w-auto">Take the 2-Min Quiz</Link>
                        <Link to="/contact" className="inline-flex items-center justify-center border border-gold-dark text-gold-dark px-6 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest min-h-[48px] w-full sm:w-auto">Contact Us</Link>
                      </div>
                    </li>
                  )}
                  {!eventsLoading && upcomingEvents.map((ev, i) => (
                    <motion.li
                      // key on title+date — stable if event order changes
                      key={`${ev.title}-${ev.date.toISOString()}`}
                      variants={fadeUp}
                      initial="hidden"
                      whileInView={shouldReduceMotion ? "static" : "visible"}
                      viewport={{ once: true }}
                      custom={i * 0.08}
                      className={`border rounded-sm bg-card overflow-hidden ${
                        ev.highlight ? "border-gold/40" : "border-border"
                      }`}
                    >
                      {ev.highlight && (
                        <div className="bg-gold-shimmer text-accent-foreground px-4 py-1 text-sm font-sans font-semibold uppercase tracking-widest">
                          Featured Event
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-sm mb-2 ${typeBadgeClass[ev.type]}`}
                            >
                              {typeLabel[ev.type]}
                            </span>
                            <h3 className="text-xl font-serif text-foreground">{ev.title}</h3>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground font-sans">
                          <span className="inline-flex items-center gap-1.5">

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
                            className="inline-flex items-center gap-1.5 mt-4 text-sm font-sans font-medium text-gold-dark hover:opacity-80 transition-opacity min-h-[48px]"
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

        {/* ── Rehearsal Night ── */}
        {/* Legacy anchor: keeps old /events#loi links landing here */}
        <span id="loi" aria-hidden="true" />
        <section
  id="rehearsal-night"
  className="py-16 md:py-24 bg-background border-t border-border"
  aria-labelledby="rehearsal-night-heading"
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
                id="rehearsal-night-heading"
                className="text-3xl md:text-4xl font-serif text-foreground mb-4"
              >
                Rehearsal Night
              </h2>
              <p className="text-muted-foreground font-sans mb-10 max-w-xl mx-auto">
                Sharpen your ritual and enjoy the fellowship of Brethren from across the Province
                of Surrey.
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={0.2}
              className="max-w-2xl mx-auto border border-border rounded-sm bg-card overflow-hidden"
            >
              <div className="bg-navy p-8 text-center">

                <p className="text-gold uppercase tracking-widest text-sm font-sans mb-2">
                  Weekly Sessions
                </p>

                <p className="text-2xl md:text-3xl font-serif text-gold">
                  Thursday Evenings — 7.30 pm
                </p>

                <p className="text-primary-foreground/80 font-sans text-sm mt-2">
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
                  Join us at our weekly Rehearsal Night sessions where we practise the next
                  ceremony in our Masonic diary. Open to all Freemasons from any Lodge in Surrey
                  and beyond.
                </p>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">
                    Open to all Freemasons from any Lodge.
                  </strong>
                </p>

                <a
                  href="mailto:secretary@weybridgelodge.org.uk?subject=Rehearsal%20Night"
                  className="flex w-full items-center justify-center bg-gold-shimmer text-accent-foreground py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity mt-4 min-h-[48px]"
                >
                  Email for Details
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        {/* Previous version: bare section, single button, no heading, no copy — dead end. */}
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
              <p className="text-primary-foreground/80 font-sans mb-8">
                Reserve your place at the next Weybridge Lodge Festive Board at the Guildford
                Masonic Centre, GU2 4DR — three courses, good company, and a genuine Masonic
                evening in Surrey.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4">
                <Link
                  to="/bookings"
                  className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Book a Dining Place
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/join-us"
                  className="inline-flex items-center justify-center bg-transparent text-gold border border-gold/40 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Enquire About Joining
                </Link>
                <Link to="/freemason-initiation-night" className="inline-flex items-center justify-center bg-transparent text-gold border border-gold/40 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto">Your Initiation Night</Link>
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
