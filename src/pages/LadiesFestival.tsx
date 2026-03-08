import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  MapPin, Clock, Ticket, ExternalLink, Users, Music, Gift,
  UtensilsCrossed, CalendarDays, Hotel, Car, Heart, Send, Wine, Plus, Minus,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ladiesFestivalImg from "@/assets/events/ladies-festival-venue.jpg";

/* ── Countdown logic ── */
const TARGET = new Date(2026, 7, 22, 18, 30, 0); // 22 Aug 2026 6:30 pm

function useCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, TARGET.getTime() - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { days, hours, minutes, seconds };
}

/* ── Wine list ── */
const wineOptions = [
  { id: "prosecco", name: "Prosecco", price: 28, note: "per bottle" },
  { id: "house-white", name: "House White Wine", price: 24, note: "per bottle" },
  { id: "house-red", name: "House Red Wine", price: 24, note: "per bottle" },
  { id: "champagne", name: "Champagne", price: 48, note: "per bottle" },
];

/* ── Booking form schema ── */
const bookingSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100, "Name must be under 100 characters"),
  email: z.string().trim().email("Please enter a valid email").max(255, "Email must be under 255 characters"),
  phone: z.string().trim().optional(),
  guests: z.string().min(1, "Please enter number of guests"),
  dietary: z.string().max(500, "Please keep dietary notes under 500 characters").optional(),
  message: z.string().max(1000, "Please keep your message under 1000 characters").optional(),
});
type BookingValues = z.infer<typeof bookingSchema>;

/* ── Schema.org ── */
const ladiesFestivalSchema = {
  "@context": "https://schema.org",
  "@type": "SocialEvent",
  name: "Weybridge & Astolat Lodges Ladies Festival 2026",
  startDate: "2026-08-22T18:30:00+01:00",
  endDate: "2026-08-23T01:00:00+01:00",
  description:
    "Black tie charity gala dinner in aid of Guildford Young Carers. Three-course dinner, DJ, Grand Raffle and more at the Macdonald Frimley Hall Hotel.",
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
    url: "https://www.weybridgelodge.org.uk/ladies-festival",
  },
};

/* ── Component ── */
const LadiesFestival = () => {
  const countdown = useCountdown();
  const { toast } = useToast();
  const [wineOrders, setWineOrders] = useState<Record<string, number>>({});

  const updateWine = (id: string, delta: number) => {
    setWineOrders((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const wineTotal = Object.entries(wineOrders).reduce((sum, [id, qty]) => {
    const wine = wineOptions.find((w) => w.id === id);
    return sum + (wine ? wine.price * qty : 0);
  }, 0);

  const form = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { name: "", email: "", phone: "", guests: "", dietary: "", message: "" },
  });

  const onSubmit = (data: BookingValues) => {
    const wineLines = Object.entries(wineOrders)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const wine = wineOptions.find((w) => w.id === id);
        return wine ? `  ${wine.name} x${qty} (£${wine.price * qty})` : "";
      })
      .join("\n");

    const subject = encodeURIComponent("Ladies Festival 2026 – Booking");
    const body = encodeURIComponent(
      [
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        data.phone ? `Phone: ${data.phone}` : null,
        `Number of Guests: ${data.guests}`,
        `Dietary Requirements: ${data.dietary || "None"}`,
        wineLines ? `\nWine Pre-Order:\n${wineLines}\nWine Total: £${wineTotal}` : null,
        data.message ? `\nMessage: ${data.message}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    );
    window.location.href = `mailto:secretary@astolat.org?subject=${subject}&body=${body}`;
    toast({
      title: "Opening your email client…",
      description: "If nothing happens, please email secretary@astolat.org directly.",
    });
  };

  const countdownUnits = [
    { label: "Days", value: countdown.days },
    { label: "Hours", value: countdown.hours },
    { label: "Minutes", value: countdown.minutes },
    { label: "Seconds", value: countdown.seconds },
  ];

  return (
    <div className="min-h-screen">
      <SEO
        title="Ladies Festival 2026 – Black Tie Gala Dinner, Frimley Hall"
        description="Join Weybridge & Astolat Lodges for a black tie charity gala on 22 August 2026 at Macdonald Frimley Hall Hotel. Three-course dinner, DJ, raffle — in aid of Guildford Young Carers. Tickets £75."
        canonical="/ladies-festival"
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Events", url: "/events" },
            { name: "Ladies Festival", url: "/ladies-festival" },
          ]),
          ladiesFestivalSchema,
        ]}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />

      <main id="main-content">
        {/* ── Hero with countdown ── */}
        <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${ladiesFestivalImg})` }}
            role="img"
            aria-label="Elegant gala dinner venue with chandeliers — Ladies Festival 2026"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220_45%_10%/0.80)] via-[hsl(220_45%_10%/0.70)] to-[hsl(220_45%_10%/0.90)]" />

          <div className="relative z-10 container mx-auto px-4 sm:px-6 text-center py-32">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <p className="text-gold uppercase tracking-[0.3em] text-sm font-sans mb-4">Black Tie Charity Gala</p>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-primary-foreground leading-tight mb-2">
                Ladies Festival
                <span className="block text-gradient-gold text-2xl sm:text-3xl md:text-4xl mt-3">2026</span>
              </h1>
              <p className="text-primary-foreground/70 font-sans text-lg mt-4 mb-2">
                Weybridge &amp; Astolat Lodges
              </p>
              <p className="text-primary-foreground/60 font-sans text-base">
                Saturday 22nd August 2026 &bull; 6.30 pm – 1.00 am
              </p>
            </motion.div>

            {/* Countdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-10 flex justify-center gap-4 sm:gap-6"
              aria-label="Countdown to Ladies Festival"
            >
              {countdownUnits.map((u) => (
                <div key={u.label} className="flex flex-col items-center">
                  <span className="text-3xl sm:text-5xl md:text-6xl font-serif text-gold tabular-nums">
                    {String(u.value).padStart(2, "0")}
                  </span>
                  <span className="text-primary-foreground/50 text-xs sm:text-sm font-sans uppercase tracking-widest mt-1">
                    {u.label}
                  </span>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            >
              <a
                href="#booking"
                className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Reserve Your Place
              </a>
              <a
                href="#venue"
                className="inline-flex items-center justify-center border border-primary-foreground/30 text-primary-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
              >
                View Venue
              </a>
            </motion.div>
          </div>
        </section>

        {/* ── What's Included ── */}
        <section className="py-16 md:py-24 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground">An Evening to Remember</h2>
              <p className="text-muted-foreground font-sans mt-3 max-w-xl mx-auto">
                Celebrate with friends, family and fellow Freemasons at this spectacular black tie evening.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: UtensilsCrossed, title: "Three-Course Dinner", desc: "Exquisite dining with dietary requirements catered for" },
                { icon: Music, title: "DJ & Dancing", desc: "Dance the night away until 1 am" },
                { icon: Gift, title: "Charity Grand Raffle", desc: "Fantastic prizes in aid of Guildford Young Carers" },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-card border border-border rounded-sm p-6 text-center shadow-sm"
                >
                  <item.icon className="w-8 h-8 text-gold mx-auto mb-4" aria-hidden="true" />
                  <h3 className="font-serif text-foreground text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-sans">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Menu ── */}
        <section id="menu" className="py-16 md:py-24 bg-card scroll-mt-20">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-10">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground">The Menu</h2>
              <p className="text-muted-foreground font-sans mt-3">Three-course dinner with coffee &amp; petits fours</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-warm-white border border-border rounded-sm p-8 md:p-10 shadow-sm space-y-8"
            >
              {[
                {
                  course: "Starter",
                  title: "To Be Confirmed",
                  description: "Details coming soon.",
                },
                {
                  course: "Main Course",
                  title: "To Be Confirmed",
                  description: "Details coming soon.",
                },
                {
                  course: "Dessert",
                  title: "To Be Confirmed",
                  description: "Details coming soon.",
                },
              ].map((item, i) => (
                <div key={item.course} className={i > 0 ? "border-t border-border pt-8" : ""}>
                  <p className="text-gold uppercase tracking-widest text-xs font-sans font-semibold mb-2">{item.course}</p>
                  <h3 className="font-serif text-foreground text-xl mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-sans">{item.description}</p>
                </div>
              ))}

              <div className="border-t border-border pt-8">
                <p className="text-gold uppercase tracking-widest text-xs font-sans font-semibold mb-2">To Finish</p>
                <h3 className="font-serif text-foreground text-xl mb-1">Coffee &amp; Petits Fours</h3>
              </div>

              <p className="text-xs text-muted-foreground font-sans italic text-center pt-4">
                Vegetarian, vegan, and other dietary requirements will be catered for — please advise when booking.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Venue & Accommodation ── */}
        <section id="venue" className="py-16 md:py-24 bg-warm-white scroll-mt-20">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground">Venue &amp; Accommodation</h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Venue details */}
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-gold mt-1 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="font-sans font-medium text-foreground">Macdonald Frimley Hall Hotel</h3>
                    <p className="text-sm text-muted-foreground font-sans">Lime Avenue, Frimley, Camberley, Surrey GU15 2BG</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Clock className="w-5 h-5 text-gold mt-1 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="font-sans font-medium text-foreground">Arrival from 6.30 pm</h3>
                    <p className="text-sm text-muted-foreground font-sans">Reception drinks, followed by dinner and entertainment until 1.00 am.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Hotel className="w-5 h-5 text-gold mt-1 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="font-sans font-medium text-foreground">Overnight Stay</h3>
                    <p className="text-sm text-muted-foreground font-sans">
                      Rooms available at a special rate for festival guests. Contact the hotel directly and mention the Weybridge &amp; Astolat Ladies Festival.
                    </p>
                    <a
                      href="https://www.macdonaldhotels.co.uk/frimley-hall"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-sans text-gold hover:opacity-80 transition-opacity mt-2"
                    >
                      Visit hotel website <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Car className="w-5 h-5 text-gold mt-1 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="font-sans font-medium text-foreground">Getting There</h3>
                    <p className="text-sm text-muted-foreground font-sans">
                      Complimentary on-site parking. The hotel is a short drive from the M3 (Junction 4) and Frimley railway station.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Map — centred on Macdonald Frimley Hall Hotel using place ID */}
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <div className="border border-border rounded-sm overflow-hidden shadow-sm h-full min-h-[320px]">
                  <iframe
                    title="Macdonald Frimley Hall Hotel location"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2498.5!2d-0.7438!3d51.3189!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4875d3b0b1b6e6e7%3A0x9c2b84e50c84a30e!2sMacdonald%20Frimley%20Hall%20Hotel%20%26%20Spa!5e0!3m2!1sen!2suk!4v1700000000001!5m2!1sen!2suk"
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: "320px" }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Charity Spotlight ── */}
        <section className="py-16 md:py-24 bg-card">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="text-center mb-10">
                <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
                <h2 className="text-3xl md:text-4xl font-serif text-foreground">In Aid of Guildford Young Carers</h2>
              </div>

              <div className="bg-warm-white border border-border rounded-sm p-8 md:p-10 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Heart className="w-6 h-6 text-gold" aria-hidden="true" />
                  <h3 className="font-serif text-foreground text-xl">Making a Difference Locally</h3>
                </div>
                <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                  The Guildford Young Carers Fund is a dedicated initiative supporting young carers aged 5–18 in the Borough of Guildford.
                  These young people take on significant caring responsibilities for family members and the fund provides grants to support
                  their educational, emotional, and social needs — helping them thrive despite the challenges they face.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                  By attending the Ladies Festival, you'll be directly contributing to improving the lives of these remarkable young people
                  in our local community. Every ticket, raffle entry, and donation on the night goes towards this vital cause.
                </p>

                <div className="grid sm:grid-cols-3 gap-4 my-8">
                  {[
                    { stat: "5–18", label: "Age range supported" },
                    { stat: "100%", label: "Funds stay local" },
                    { stat: "£75", label: "Your ticket helps" },
                  ].map((item) => (
                    <div key={item.label} className="text-center p-4 bg-muted/30 border border-border rounded-sm">
                      <p className="text-2xl font-serif text-gold">{item.stat}</p>
                      <p className="text-xs text-muted-foreground font-sans mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>

                <a
                  href="https://www.cfsurrey.org.uk/fund/guildfordyoungcarers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-sans font-medium text-gold hover:opacity-80 transition-opacity"
                >
                  Learn more about Guildford Young Carers <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Booking Form with Wine Pre-Order ── */}
        <section id="booking" className="py-16 md:py-24 bg-warm-white scroll-mt-20">
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-10">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground">Book Your Tickets</h2>
              <p className="text-muted-foreground font-sans mt-3 max-w-lg mx-auto">
                £75 per person &bull; Complete the form below and we'll be in touch to confirm your booking.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-card border border-border rounded-sm p-8 shadow-sm">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans text-foreground">Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-sans text-foreground">Email Address *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-sans text-foreground">Phone Number</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="07xxx xxxxxx" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="guests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans text-foreground">Number of Guests *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max="20" placeholder="2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dietary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans text-foreground">Dietary Requirements</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Vegetarian, gluten-free" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* ── Wine Pre-Order ── */}
                  <div className="border-t border-border pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Wine className="w-5 h-5 text-gold" aria-hidden="true" />
                      <h3 className="font-serif text-foreground text-lg">Pre-Order Wine for Your Table</h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-sans mb-5">
                      Save time on the night — pre-order bottles for your party and they'll be waiting at your table.
                    </p>

                    <div className="space-y-4">
                      {wineOptions.map((wine) => {
                        const qty = wineOrders[wine.id] || 0;
                        return (
                          <div
                            key={wine.id}
                            className="flex items-center justify-between gap-4 bg-warm-white border border-border rounded-sm p-4"
                          >
                            <div className="min-w-0">
                              <p className="font-sans font-medium text-foreground text-sm">{wine.name}</p>
                              <p className="text-xs text-muted-foreground font-sans">
                                £{wine.price} {wine.note}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => updateWine(wine.id, -1)}
                                disabled={qty === 0}
                                className="w-8 h-8 rounded-sm border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50 disabled:opacity-30 transition-colors"
                                aria-label={`Remove one ${wine.name}`}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center font-sans text-sm font-medium text-foreground tabular-nums">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateWine(wine.id, 1)}
                                className="w-8 h-8 rounded-sm border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors"
                                aria-label={`Add one ${wine.name}`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {wineTotal > 0 && (
                      <p className="mt-4 text-right font-sans text-sm">
                        <span className="text-muted-foreground">Wine total: </span>
                        <span className="font-semibold text-foreground">£{wineTotal}</span>
                      </p>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans text-foreground">Table Preferences / Message</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g. We'd like to sit with the Jones party" rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-gold-shimmer text-accent-foreground py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity h-auto"
                  >
                    <Send className="w-4 h-4 mr-2" /> Send Booking Enquiry
                  </Button>

                  <p className="text-xs text-muted-foreground font-sans text-center">
                    Your details will be emailed to the festival organisers. We won't store or share your data.
                  </p>
                </form>
              </Form>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LadiesFestival;
