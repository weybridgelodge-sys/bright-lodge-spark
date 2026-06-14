import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema, eventSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar as CalendarIcon, MapPin, Clock, Ticket, ExternalLink, Users, Music, Gift, UtensilsCrossed } from "lucide-react";
import ladiesFestivalImg from "@/assets/events/ladies-festival-venue.jpg";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay } from "date-fns";
import { events, typeLabel, typeBadgeClass } from "@/data/events";

const eventDates = events.map((e) => e.date);

const Events = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const eventsForDate = selectedDate
    ? events.filter((e) => isSameDay(e.date, selectedDate))
    : [];

  const upcomingEvents = [...events]
    .filter((e) => e.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const ladiesFestivalSchema = {
    "@context": "https://schema.org",
    "@type": "SocialEvent",
    name: "Weybridge & Astolat Lodges Ladies Festival 2026",
    startDate: "2026-08-22T18:30:00+01:00",
    endDate: "2026-08-23T01:00:00+01:00",
    description: "Black tie charity gala dinner in aid of Guildford Young Carers. Three-course dinner, DJ, Grand Raffle and more at the Macdonald Frimley Hall Hotel.",
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

  const schemas = [
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
  ];

  return (
    <div className="min-h-screen">
      <SEO
        title="Events – Masonic Meetings, Ladies Festival & Lodge of Instruction Guildford"
        description="View upcoming Freemasons meetings, the 2026 Ladies Festival black tie gala, and weekly Lodge of Instruction evenings at Weybridge Lodge No. 6787, Guildford, Surrey."
        canonical="/events"
        schema={schemas}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader title="Events" subtitle="Masonic meetings, social events & Lodge of Instruction in Guildford, Surrey" />

        {/* ── Calendar + Upcoming ── */}
        <section className="py-16 md:py-24 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="flex flex-col lg:flex-row gap-10">
              {/* Calendar sidebar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="lg:w-[340px] shrink-0"
              >
                <h2 className="text-2xl font-serif text-foreground mb-4">Calendar</h2>
                <div className="border border-border rounded-sm bg-card p-4 shadow-sm">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="p-3 pointer-events-auto"
                    modifiers={{ event: eventDates }}
                    modifiersClassNames={{
                      event: "bg-accent text-accent-foreground font-bold ring-2 ring-accent rounded-full",
                    }}
                  />
                  {selectedDate && (
                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-sm font-sans font-medium text-foreground mb-2">
                        {format(selectedDate, "EEEE d MMMM yyyy")}
                      </p>
                      {eventsForDate.length === 0 ? (
                        <p className="text-sm text-muted-foreground font-sans">No events on this date.</p>
                      ) : (
                        <ul className="space-y-2">
                          {eventsForDate.map((ev, i) => (
                            <li key={i} className="text-sm font-sans">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs mr-2 ${typeBadgeClass[ev.type]}`}>
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
                <h2 className="text-2xl font-serif text-foreground mb-6">Upcoming Events</h2>
                <div className="space-y-6">
                  {upcomingEvents.map((ev, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                      className={`border rounded-sm bg-card shadow-sm overflow-hidden ${ev.highlight ? "border-accent" : "border-border"}`}
                    >
                      {ev.highlight && (
                        <div className="bg-gold-shimmer px-4 py-1 text-xs font-sans font-semibold uppercase tracking-widest text-accent-foreground">
                          Featured Event
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs mb-2 ${typeBadgeClass[ev.type]}`}>
                              {typeLabel[ev.type]}
                            </span>
                            <h3 className="text-xl font-serif text-foreground">{ev.title}</h3>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground font-sans">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarIcon className="w-4 h-4 text-gold" />
                            {format(ev.date, "EEEE d MMMM yyyy")}
                          </span>
                          {ev.time && (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-gold" />
                              {ev.time}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-gold" />
                            {ev.venue}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="mt-3 text-sm text-muted-foreground font-sans leading-relaxed">{ev.description}</p>
                        )}
                        {ev.link && (
                          <Link
                            to={ev.link}
                            className="inline-flex items-center gap-1.5 mt-4 text-sm font-sans font-medium text-gold hover:opacity-80 transition-opacity"
                          >
                            View Full Details
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Ladies Festival Feature ── */}
        <section className="py-16 md:py-24 bg-card">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground text-center mb-2">
                Ladies Festival 2026
              </h2>
              <p className="text-center text-muted-foreground font-sans mb-10">
                Weybridge &amp; Astolat Lodges
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="border border-border rounded-sm shadow-lg overflow-hidden"
            >
              <div className="relative">
                <img
                  src={ladiesFestivalImg}
                  alt="Elegant black-tie gala dinner venue with round tables and chandeliers — Ladies Festival 2026 by Weybridge and Astolat Lodges"
                  className="w-full h-56 md:h-72 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--primary))]/90 to-[hsl(var(--primary))]/40" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                  <p className="text-gold uppercase tracking-widest text-sm font-sans mb-2">Black Tie</p>
                  <p className="text-3xl md:text-4xl font-serif text-primary-foreground">
                    Saturday 22nd August 2026
                  </p>
                  <p className="text-primary-foreground/60 font-sans text-sm mt-2">
                    6.30 pm – 1.00 am
                  </p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-sans font-medium text-foreground">Macdonald Frimley Hall Hotel</p>
                    <p className="text-sm text-muted-foreground font-sans">Lime Avenue, Frimley, Camberley GU15 2BG</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Ticket className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-sans font-medium text-foreground">Tickets: £75 per person</p>
                    <p className="text-sm text-muted-foreground font-sans">Three-course dinner included</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <UtensilsCrossed className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-sans font-medium text-foreground">Three-Course Dinner</p>
                    <div className="mt-2 bg-muted/50 border border-border rounded-sm p-4 text-sm text-muted-foreground font-sans space-y-2">
                      <p className="font-medium text-foreground">Menu</p>
                      <p><span className="text-gold font-medium">Starter:</span> To be confirmed</p>
                      <p><span className="text-gold font-medium">Main:</span> To be confirmed</p>
                      <p><span className="text-gold font-medium">Dessert:</span> To be confirmed</p>
                      <p className="text-xs italic mt-2">Full menu details coming soon. Dietary requirements will be catered for — please advise when booking.</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-serif text-foreground pt-2">The Evening Includes</h3>
                <ul className="grid sm:grid-cols-2 gap-3 text-sm font-sans text-muted-foreground">
                  <li className="flex items-center gap-2"><Music className="w-4 h-4 text-gold shrink-0" /> DJ &amp; dancing</li>
                  <li className="flex items-center gap-2"><Gift className="w-4 h-4 text-gold shrink-0" /> Charity Grand Raffle</li>
                  <li className="flex items-center gap-2"><Ticket className="w-4 h-4 text-gold shrink-0" /> Fun Casino</li>
                </ul>

                {/* Charity info */}
                <div className="mt-6 bg-muted/30 border border-border rounded-sm p-6">
                  <h3 className="text-lg font-serif text-foreground mb-3">In Aid of Guildford Young Carers</h3>
                  <p className="text-sm font-sans text-muted-foreground leading-relaxed mb-3">
                    The Guildford Young Carers Fund is a dedicated initiative supporting young carers aged 5–18 in the Borough of Guildford. These young people take on significant caring responsibilities for family members and the fund provides grants to support their educational, emotional, and social needs — helping them thrive despite the challenges they face.
                  </p>
                  <p className="text-sm font-sans text-muted-foreground leading-relaxed mb-4">
                    By attending the Ladies Festival, you'll be directly contributing to improving the lives of these remarkable young people in our local community.
                  </p>
                  <a
                    href="https://www.cfsurrey.org.uk/fund/guildfordyoungcarers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-sans font-medium text-gold hover:opacity-80 transition-opacity"
                  >
                    Learn more about Guildford Young Carers
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <a
                  href="mailto:secretary@astolat.org?subject=Ladies%20Festival%202026"
                  className="block w-full text-center bg-gold-shimmer text-accent-foreground py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity mt-4"
                >
                  Enquire About Tickets
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Lodge of Instruction ── */}
        <section className="py-16 md:py-24 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                Lodge of Instruction
              </h2>
              <p className="text-muted-foreground font-sans mb-10 max-w-xl mx-auto">
                Sharpen your ritual and enjoy the fellowship of Brethren from across the Province.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="max-w-2xl mx-auto border border-border rounded-sm bg-card shadow-sm overflow-hidden"
            >
              <div className="bg-navy-gradient p-8 text-center">
                <p className="text-gold uppercase tracking-widest text-sm font-sans mb-2">Weekly Sessions</p>
                <p className="text-2xl md:text-3xl font-serif text-primary-foreground">
                  Thursday Evenings — 7.30 pm
                </p>
                <p className="text-primary-foreground/60 font-sans text-sm mt-2">
                  1st Thursday in September to 2nd Thursday in May
                </p>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-sans font-medium text-foreground">South West Surrey Masonic Centre</p>
                    <p className="text-sm text-muted-foreground font-sans">Hitherbury Close, Guildford GU2 4DR</p>
                  </div>
                </div>

                <p className="text-sm font-sans text-muted-foreground leading-relaxed">
                  Join us at our weekly Lodge of Instruction sessions where we practice the next ceremony in our Masonic diary.
                </p>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Open to all Freemasons from any Lodge.</strong>
                </p>

                <a
                  href="mailto:mentor@weybridgelodge.org.uk?subject=Lodge%20of%20Instruction"
                  className="block w-full text-center bg-gold-shimmer text-accent-foreground py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity mt-4"
                >
                  Email for Details
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-navy-gradient">
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <Link
              to="/bookings"
              className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Book a Dining Place
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Events;
