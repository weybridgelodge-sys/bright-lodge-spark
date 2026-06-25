import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { PaymentTestModeBanner } from "@/components/payments/PaymentTestModeBanner";
import { StripeEmbeddedCheckoutPanel, type BookingLineItem } from "@/components/payments/StripeEmbeddedCheckout";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  MapPin, Clock, Ticket, ExternalLink, Users, Music, Gift,
  UtensilsCrossed, CalendarDays, Hotel, Car, Heart, Send, Wine, Plus, Minus,
  ChevronRight, ChevronLeft, Beer, CreditCard, Dice5, Camera,
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

/* ── Beer list ── */
const beerOptions = [
  { id: "lager", name: "Lager (Pint)", price: 6, note: "per pint" },
  { id: "ale", name: "Ale (Pint)", price: 6, note: "per pint" },
  { id: "beer-bucket", name: "Beer Bucket (5 bottles)", price: 25, note: "per bucket" },
];

const TICKET_PRICE = 75;

/* ── Booking form schema ── */
const bookingSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100, "Name must be under 100 characters"),
  email: z.string().trim().email("Please enter a valid email").max(255, "Email must be under 255 characters"),
  phone: z.string().trim().min(5, "Please enter a valid phone number").max(20, "Phone number must be under 20 characters"),
  guests: z.string().min(1, "Please enter number of additional guests"),
  seatingPreference: z.string().max(500, "Please keep seating notes under 500 characters").optional(),
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
    url: "https://www.weybridgelodge.org.uk/ladies-festival",
  },
};

const menuChoices = {
  starter: [
    { value: "soup", label: "Roasted Butternut Squash Soup (V)" },
    { value: "terrine", label: "Ham Hock & Pea Terrine" },
  ],
  main: [
    { value: "chicken", label: "Corn Fed Chicken Breast (GF)" },
    { value: "strudel", label: "Mediterranean Roasted Vegetable Strudel (V)" },
  ],
  dessert: [
    { value: "sticky-toffee", label: "Sticky Toffee Pudding" },
    { value: "frimley-mess", label: "Frimley Mess (V)" },
  ],
};

type GuestInfo = {
  name: string;
  starter: string;
  main: string;
  dessert: string;
};

/* ── Component ── */
const LadiesFestival = () => {
  const countdown = useCountdown();
  const { toast } = useToast();
  const [wineOrders, setWineOrders] = useState<Record<string, number>>({});
  const [beerOrders, setBeerOrders] = useState<Record<string, number>>({});
  // guestCount = number of ADDITIONAL guests beyond the lead booker
  const [guestCount, setGuestCount] = useState(0);
  const [leadGuest, setLeadGuest] = useState<GuestInfo>({ name: "", starter: "", main: "", dessert: "" });
  const [guests, setGuests] = useState<GuestInfo[]>([]);
  const [formStep, setFormStep] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);
  const [coverFee, setCoverFee] = useState(false);
  const [paymentOption, setPaymentOption] = useState<"full" | "deposit">("full");
  const [submitted, setSubmitted] = useState<BookingValues | null>(null);

  const form = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { name: "", email: "", phone: "", guests: "0", seatingPreference: "", dietary: "", message: "" },
  });

  const contactName = form.watch("name");

  // Keep lead booker's name in sync with the contact name field
  useEffect(() => {
    setLeadGuest((prev) => ({ ...prev, name: contactName || "" }));
  }, [contactName]);

  const updateGuestCount = (count: number) => {
    const clamped = Math.max(0, Math.min(19, count));
    setGuestCount(clamped);
    setGuests((prev) => {
      if (clamped > prev.length) {
        return [...prev, ...Array.from({ length: clamped - prev.length }, () => ({ name: "", starter: "", main: "", dessert: "" }))];
      }
      return prev.slice(0, clamped);
    });
  };

  const updateGuest = (index: number, field: keyof GuestInfo, value: string) => {
    setGuests((prev) => prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)));
  };

  const updateLeadGuest = (field: keyof GuestInfo, value: string) => {
    setLeadGuest((prev) => ({ ...prev, [field]: value }));
  };

  // Combined list of all attendees (lead booker + additional guests) for summaries & emails
  const allAttendees: GuestInfo[] = [leadGuest, ...guests];
  const totalAttendees = 1 + guestCount;

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

  const updateBeer = (id: string, delta: number) => {
    setBeerOrders((prev) => {
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

  const beerTotal = Object.entries(beerOrders).reduce((sum, [id, qty]) => {
    const beer = beerOptions.find((b) => b.id === id);
    return sum + (beer ? beer.price * qty : 0);
  }, 0);

  const ticketSubtotal = totalAttendees * TICKET_PRICE;
  const drinksTotal = wineTotal + beerTotal;
  const grandTotal = ticketSubtotal + drinksTotal;
  // Apply the chosen payment option (full or 33.33% deposit) to the amount due now
  const grandTotalPence = grandTotal * 100;
  const depositPence = Math.round(grandTotalPence / 3);
  const balanceDuePence = paymentOption === "deposit" ? grandTotalPence - depositPence : 0;
  const subtotalPence = paymentOption === "deposit" ? depositPence : grandTotalPence;
  const feePence = coverFee ? Math.ceil(subtotalPence * 0.02) : 0;
  const totalPence = subtotalPence + feePence;

  const buildLineItems = (): BookingLineItem[] => {
    if (paymentOption === "deposit") {
      // Single line item for the deposit; full breakdown is preserved in `details`
      return [
        {
          label: `Ladies Festival 2026 — 33% deposit (${totalAttendees} place${totalAttendees === 1 ? "" : "s"})`,
          qty: 1,
          unit_price_pence: depositPence,
        },
      ];
    }
    const items: BookingLineItem[] = [
      { label: `Ladies Festival 2026 — ticket`, qty: totalAttendees, unit_price_pence: TICKET_PRICE * 100 },
    ];
    for (const [id, qty] of Object.entries(wineOrders)) {
      if (qty > 0) {
        const w = wineOptions.find((x) => x.id === id);
        if (w) items.push({ label: w.name, qty, unit_price_pence: w.price * 100 });
      }
    }
    for (const [id, qty] of Object.entries(beerOrders)) {
      if (qty > 0) {
        const b = beerOptions.find((x) => x.id === id);
        if (b) items.push({ label: b.name, qty, unit_price_pence: b.price * 100 });
      }
    }
    return items;
  };

  const onSubmit = (data: BookingValues) => {
    setSubmitted(data);
    setShowCheckout(true);
  };

  const goToStep = async (step: number) => {
    if (step > formStep) {
      // Validate step 1 fields before proceeding
      if (formStep === 1) {
        const valid = await form.trigger(["name", "email", "phone", "guests"]);
        if (!valid) return;
      }
    }
    setFormStep(step);
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
        title="Ladies Festival 2026"
        description="Join Weybridge & Astolat Lodges for a black tie charity gala on 22 August 2026 at Macdonald Frimley Hall Hotel. Three-course dinner, DJ, raffle — in aid of Action for Carers Surrey. Tickets £75."
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
              <p className="text-gold-dark uppercase tracking-[0.3em] text-sm font-sans mb-4">Black Tie Charity Gala</p>
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
              <p className="text-primary-foreground/60 font-sans text-base mt-1">
                Macdonald Frimley Hall Hotel &amp; Spa
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
                  <span className="text-3xl sm:text-5xl md:text-6xl font-serif text-gold-dark tabular-nums">
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
                className="inline-flex items-center justify-center border border-primary-foreground/30 text-primary-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold-dark hover:text-gold-dark-dark transition-colors"
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
                The Worshipful Masters of Weybridge and Astolat Lodges warmly invite you to a spectacular evening in aid of <span className="text-gold-dark font-semibold">"Action for Carers Surrey"</span>.
              </p>
              <p className="text-muted-foreground font-sans mt-3 max-w-xl mx-auto">
                Join us for an unforgettable black‑tie celebration with friends, family and fellow Freemasons — an evening of fine dining, dancing and entertainment you won't want to miss.
              </p>

               <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-6 mb-2">
                 {[
                   { time: "6.30 pm", label: "Arrival" },
                   { time: "7.30 pm", label: "Dinner" },
                   { time: "1.00 am", label: "Carriages" },
                 ].map((item) => (
                   <div key={item.label} className="flex flex-col items-center">
                     <span className="text-xl sm:text-2xl font-serif text-gold-dark">{item.time}</span>
                     <span className="text-xs text-muted-foreground font-sans uppercase tracking-widest mt-1">{item.label}</span>
                   </div>
                 ))}
               </div>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: UtensilsCrossed, title: "Three-Course Dinner", desc: "Exquisite dining with dietary requirements catered for" },
                { icon: Music, title: "DJ & Dancing", desc: "Acclaimed DJ Lee Russell will keep you groovin' and movin' all night long" },
                { icon: Dice5, title: "Fun Casino", desc: "Try your luck at Roulette or Blackjack with our professional croupiers — it's Vegas, but posher" },
                { icon: Camera, title: "Photo Memories", desc: "Capture the magic of the evening with our professional photographer — stunning portrait photos to treasure forever" },
                { icon: Gift, title: "Gift for Each Lady", desc: "As a special thank you for joining us, every lady will receive a beautiful keepsake gift to remember the evening" },
                { icon: Heart, title: "Charity Grand Raffle & More", desc: "Fantastic prizes in aid of Action for Carers Surrey" },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-card border border-border rounded-sm p-6 text-center shadow-sm"
                >
                  <item.icon className="w-8 h-8 text-gold-dark mx-auto mb-4" aria-hidden="true" />
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
              <p className="text-muted-foreground font-sans mt-3">Three-course dinner with coffee — two choices per course</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-warm-white border border-border rounded-sm p-8 md:p-10 shadow-sm space-y-8 text-center"
            >
              <div>
                <p className="text-gold-dark uppercase tracking-widest text-xs font-sans font-semibold mb-3">Starters</p>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-serif text-foreground text-lg">Roasted Butternut Squash Soup <span className="italic text-sm text-muted-foreground">(V)</span></h3>
                    <p className="text-sm text-muted-foreground font-sans">Curried oil</p>
                  </div>
                  <div>
                    <h3 className="font-serif text-foreground text-lg">Ham Hock &amp; Pea Terrine</h3>
                    <p className="text-sm text-muted-foreground font-sans">Plum chutney, balsamic glaze, seasonal greens and herb croutons</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-8">
                <p className="text-gold-dark uppercase tracking-widest text-xs font-sans font-semibold mb-3">Mains</p>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-serif text-foreground text-lg">Corn Fed Chicken Breast</h3>
                    <p className="text-sm text-muted-foreground font-sans">Red wine jus, thyme roasted potato, glazed carrots and fine beans <span className="italic">(GF)</span></p>
                  </div>
                  <div>
                    <h3 className="font-serif text-foreground text-lg">Mediterranean Roasted Vegetable Strudel <span className="italic text-sm text-muted-foreground">(V)</span></h3>
                    <p className="text-sm text-muted-foreground font-sans">Thyme roasted potato and broccoli basil tomato sauce</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-8">
                <p className="text-gold-dark uppercase tracking-widest text-xs font-sans font-semibold mb-3">Desserts</p>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-serif text-foreground text-lg">Sticky Toffee Pudding</h3>
                    <p className="text-sm text-muted-foreground font-sans">Toffee sauce, clotted cream ice cream</p>
                  </div>
                  <div>
                    <h3 className="font-serif text-foreground text-lg">Frimley Mess <span className="italic text-sm text-muted-foreground">(V)</span></h3>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-8">
                <p className="text-gold-dark uppercase tracking-widest text-xs font-sans font-semibold mb-2">To Finish</p>
                <h3 className="font-serif text-foreground text-lg">Coffee &amp; Tea</h3>
              </div>

              <p className="text-xs text-muted-foreground font-sans italic text-center pt-4">
                Other dietary requirements will of course be catered for — please advise us on your booking form.
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
                  <MapPin className="w-5 h-5 text-gold-dark mt-1 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="font-sans font-medium text-foreground">Macdonald Frimley Hall Hotel</h3>
                    <p className="text-sm text-muted-foreground font-sans">Lime Avenue, Frimley, Camberley, Surrey GU15 2BG</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Clock className="w-5 h-5 text-gold-dark mt-1 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="font-sans font-medium text-foreground">Arrival from 6.30 pm</h3>
                    <p className="text-sm text-muted-foreground font-sans">Reception drinks, followed by dinner and entertainment until 1.00 am.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Hotel className="w-5 h-5 text-gold-dark mt-1 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="font-sans font-medium text-foreground">Overnight Stay – 20% Discount</h3>
                    <p className="text-sm text-muted-foreground font-sans">
                      We have secured a 20% discount off standard room rates for those wishing to stay over. The discount code and booking link for rooms will be sent via your ticket confirmation.
                    </p>
                    <p className="text-sm text-muted-foreground font-sans mt-2">
                      The overnight stay price includes breakfast and access to the onsite spa and gym (treatments at an additional cost).
                    </p>
                    <a
                      href="https://www.macdonaldhotels.co.uk/frimley-hall"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-sans text-gold-dark hover:opacity-80 transition-opacity mt-2"
                    >
                      Visit hotel website <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Car className="w-5 h-5 text-gold-dark mt-1 shrink-0" aria-hidden="true" />
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
                    src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d2498.5!2d-0.7247134106649139!3d51.33939840738857!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4875d4a9b5a7c4e1%3A0x27712c09b8e0a4e!2sMacdonald+Frimley+Hall+Hotel+%26+Spa!5e0!3m2!1sen!2suk!4v1700000000000"
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
                <h2 className="text-3xl md:text-4xl font-serif text-foreground">In Aid of Action for Carers Surrey</h2>
              </div>

              <div className="bg-warm-white border border-border rounded-sm p-8 md:p-10 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Heart className="w-6 h-6 text-gold-dark" aria-hidden="true" />
                  <h3 className="font-serif text-foreground text-xl">Supporting Surrey's Unpaid Carers</h3>
                </div>
                <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                  Action for Carers Surrey is the county's leading charity supporting unpaid carers of all ages — from young carers as young as five through to adults caring for family members, friends or neighbours.
                  Their services provide vital information, advice, advocacy and respite, helping carers across Surrey maintain their own health, wellbeing and independence.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                  By attending the Ladies Festival, you'll be directly contributing to the work of this remarkable charity, supporting carers right here in our local community. Every ticket, raffle entry, and donation on the night goes towards this vital cause.
                </p>

                <div className="grid sm:grid-cols-3 gap-4 my-8">
                  {[
                    { stat: "All ages", label: "Carers supported" },
                    { stat: "100%", label: "Funds stay in Surrey" },
                    { stat: "£75", label: "Your ticket helps" },
                  ].map((item) => (
                    <div key={item.label} className="text-center p-4 bg-muted/30 border border-border rounded-sm">
                      <p className="text-2xl font-serif text-gold-dark">{item.stat}</p>
                      <p className="text-xs text-muted-foreground font-sans mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>

                <a
                  href="https://www.actionforcarers.org.uk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-sans font-medium text-gold-dark hover:opacity-80 transition-opacity"
                >
                  Learn more about Action for Carers Surrey <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Booking Form – Multi-Step ── */}
        <section id="booking" className="py-16 md:py-24 bg-warm-white scroll-mt-20">
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-10">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground">Secure Your Seat</h2>
              <p className="text-muted-foreground font-sans mt-3 max-w-lg mx-auto">
                £75 per person &bull; Complete the form below and we'll be in touch to confirm your booking.
              </p>
            </motion.div>

            {/* Step indicators */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[
                { num: 1, label: "Booking Details" },
                { num: 2, label: "Drinks Pre-Order" },
                { num: 3, label: "Review & Submit" },
              ].map((s, i) => (
                <div key={s.num} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => s.num < formStep && setFormStep(s.num)}
                    className={`flex items-center gap-1.5 text-sm font-sans transition-colors ${
                      formStep === s.num
                        ? "text-gold-dark font-semibold"
                        : formStep > s.num
                          ? "text-foreground cursor-pointer hover:text-gold-dark-dark"
                          : "text-muted-foreground"
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border ${
                      formStep === s.num
                        ? "bg-gold text-accent-foreground border-gold-dark"
                        : formStep > s.num
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-muted-foreground"
                    }`}>
                      {s.num}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < 2 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              ))}
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-card border border-border rounded-sm p-8 shadow-sm">

                  {/* ═══ STEP 1: Booking Details ═══ */}
                  {formStep === 1 && (
                    <div className="space-y-6">
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
                              <FormLabel className="font-sans text-foreground">Phone Number *</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="07xxx xxxxxx" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Number of Additional Guests */}
                      <FormField
                        control={form.control}
                        name="guests"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-sans text-foreground">Number of Additional Guests *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="19"
                                placeholder="0"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 0) updateGuestCount(val);
                                }}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground font-sans mt-1">
                              In addition to yourself. Total places: <span className="font-semibold text-foreground">{totalAttendees}</span> (you + {guestCount} guest{guestCount === 1 ? "" : "s"}).
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Additional Guest Names */}
                      {guestCount > 0 && (
                        <div className="border-t border-border pt-6">
                          <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-gold-dark" aria-hidden="true" />
                            <h3 className="font-serif text-foreground text-lg">Additional Guest Names</h3>
                          </div>
                          <div className="space-y-3">
                            {guests.map((guest, i) => (
                              <div key={i}>
                                <label className="text-sm font-sans text-foreground font-medium mb-1.5 block">Guest {i + 1}</label>
                                <Input
                                  placeholder={`Guest ${i + 1} full name`}
                                  value={guest.name}
                                  onChange={(e) => updateGuest(i, "name", e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Table Seating Preference */}
                      <FormField
                        control={form.control}
                        name="seatingPreference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-sans text-foreground">Table Seating Preference</FormLabel>
                            <FormControl>
                              <Textarea placeholder="e.g. We'd like to sit with the Jones party" rows={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Menu Choices — lead booker first, then guests */}
                      <div className="border-t border-border pt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <UtensilsCrossed className="w-5 h-5 text-gold-dark" aria-hidden="true" />
                          <h3 className="font-serif text-foreground text-lg">Menu Choices</h3>
                        </div>
                        <p className="text-sm text-muted-foreground font-sans mb-5">
                          Please select a starter, main and dessert for each attendee, including yourself.
                        </p>
                        <div className="space-y-6">
                          {/* Lead booker */}
                          <div className="bg-warm-white border border-gold/40 rounded-sm p-4 space-y-3">
                            <p className="font-sans font-medium text-foreground text-sm">
                              {leadGuest.name || "You"}{" "}
                              <span className="text-xs text-gold-dark uppercase tracking-wider ml-1">Lead booker</span>
                            </p>
                            <div>
                              <label className="text-xs font-sans text-muted-foreground uppercase tracking-wider mb-1 block">Starter</label>
                              <select aria-label="Starter for lead booker"
                                value={leadGuest.starter}
                                onChange={(e) => updateLeadGuest("starter", e.target.value)}
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-sans text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <option value="">Select starter…</option>
                                {menuChoices.starter.map((c) => (
                                  <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-sans text-muted-foreground uppercase tracking-wider mb-1 block">Main</label>
                              <select aria-label="Main for lead booker"
                                value={leadGuest.main}
                                onChange={(e) => updateLeadGuest("main", e.target.value)}
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-sans text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <option value="">Select main…</option>
                                {menuChoices.main.map((c) => (
                                  <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-sans text-muted-foreground uppercase tracking-wider mb-1 block">Dessert</label>
                              <select aria-label="Dessert for lead booker"
                                value={leadGuest.dessert}
                                onChange={(e) => updateLeadGuest("dessert", e.target.value)}
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-sans text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <option value="">Select dessert…</option>
                                {menuChoices.dessert.map((c) => (
                                  <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Additional guests */}
                          {guests.map((guest, i) => (
                            <div key={i} className="bg-warm-white border border-border rounded-sm p-4 space-y-3">
                              <p className="font-sans font-medium text-foreground text-sm">{guest.name || `Guest ${i + 1}`}</p>
                              <div>
                                <label className="text-xs font-sans text-muted-foreground uppercase tracking-wider mb-1 block">Starter</label>
                                <select aria-label={`Starter for ${guest.name || `Guest ${i + 1}`}`}
                                  value={guest.starter}
                                  onChange={(e) => updateGuest(i, "starter", e.target.value)}
                                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-sans text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <option value="">Select starter…</option>
                                  {menuChoices.starter.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-sans text-muted-foreground uppercase tracking-wider mb-1 block">Main</label>
                                <select aria-label={`Main for ${guest.name || `Guest ${i + 1}`}`}
                                  value={guest.main}
                                  onChange={(e) => updateGuest(i, "main", e.target.value)}
                                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-sans text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <option value="">Select main…</option>
                                  {menuChoices.main.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-sans text-muted-foreground uppercase tracking-wider mb-1 block">Dessert</label>
                                <select aria-label={`Dessert for ${guest.name || `Guest ${i + 1}`}`}
                                  value={guest.dessert}
                                  onChange={(e) => updateGuest(i, "dessert", e.target.value)}
                                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-sans text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <option value="">Select dessert…</option>
                                  {menuChoices.dessert.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>


                      {/* Dietary Requirements */}
                      <FormField
                        control={form.control}
                        name="dietary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-sans text-foreground">Dietary Requirements</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Gluten-free, nut allergy" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Ticket Subtotal */}
                      <div className="border-t border-border pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-gold-dark" aria-hidden="true" />
                            <span className="font-sans text-foreground font-medium">Ticket Subtotal</span>
                          </div>
                          <div className="text-right">
                            <p className="font-sans text-foreground font-semibold text-lg">£{ticketSubtotal}</p>
                            <p className="text-xs text-muted-foreground font-sans">{totalAttendees} × £{TICKET_PRICE}</p>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={() => goToStep(2)}
                        className="w-full bg-gold-shimmer text-accent-foreground py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity h-auto whitespace-normal text-center leading-snug"
                      >
                        Continue to Drinks Pre-Order <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}

                  {/* ═══ STEP 2: Drinks Pre-Order ═══ */}
                  {formStep === 2 && (
                    <div className="space-y-6">
                      {/* Wine Pre-Order */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Wine className="w-5 h-5 text-gold-dark" aria-hidden="true" />
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

                      {/* Beer Pre-Order */}
                      <div className="border-t border-border pt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Beer className="w-5 h-5 text-gold-dark" aria-hidden="true" />
                          <h3 className="font-serif text-foreground text-lg">Pre-Order Beer</h3>
                        </div>

                        <div className="space-y-4">
                          {beerOptions.map((beer) => {
                            const qty = beerOrders[beer.id] || 0;
                            return (
                              <div
                                key={beer.id}
                                className="flex items-center justify-between gap-4 bg-warm-white border border-border rounded-sm p-4"
                              >
                                <div className="min-w-0">
                                  <p className="font-sans font-medium text-foreground text-sm">{beer.name}</p>
                                  <p className="text-xs text-muted-foreground font-sans">
                                    £{beer.price} {beer.note}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => updateBeer(beer.id, -1)}
                                    disabled={qty === 0}
                                    className="w-8 h-8 rounded-sm border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50 disabled:opacity-30 transition-colors"
                                    aria-label={`Remove one ${beer.name}`}
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="w-8 text-center font-sans text-sm font-medium text-foreground tabular-nums">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateBeer(beer.id, 1)}
                                    className="w-8 h-8 rounded-sm border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors"
                                    aria-label={`Add one ${beer.name}`}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {beerTotal > 0 && (
                          <p className="mt-4 text-right font-sans text-sm">
                            <span className="text-muted-foreground">Beer total: </span>
                            <span className="font-semibold text-foreground">£{beerTotal}</span>
                          </p>
                        )}
                      </div>

                      {drinksTotal > 0 && (
                        <div className="border-t border-border pt-4">
                          <p className="text-right font-sans text-sm">
                            <span className="text-muted-foreground">Drinks total: </span>
                            <span className="font-semibold text-foreground">£{drinksTotal}</span>
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setFormStep(1)}
                          className="w-full sm:flex-1 py-4 rounded-sm text-sm font-sans uppercase tracking-widest h-auto"
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" /> Back
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setFormStep(3)}
                          className="w-full sm:flex-1 bg-gold-shimmer text-accent-foreground py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity h-auto"
                        >
                          Review Booking <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ═══ STEP 3: Review & Submit ═══ */}
                  {formStep === 3 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-5 h-5 text-gold-dark" aria-hidden="true" />
                        <h3 className="font-serif text-foreground text-lg">Review Your Booking</h3>
                      </div>

                      {/* Summary */}
                      <div className="bg-warm-white border border-border rounded-sm p-6 space-y-4">
                        <div className="flex justify-between text-sm font-sans">
                          <span className="text-muted-foreground">Contact</span>
                          <span className="text-foreground font-medium">{form.getValues("name")}</span>
                        </div>
                        <div className="flex justify-between text-sm font-sans">
                          <span className="text-muted-foreground">Email</span>
                          <span className="text-foreground font-medium">{form.getValues("email")}</span>
                        </div>
                        <div className="flex justify-between text-sm font-sans">
                          <span className="text-muted-foreground">Total places</span>
                          <span className="text-foreground font-medium">{totalAttendees} (you + {guestCount} guest{guestCount === 1 ? "" : "s"})</span>
                        </div>

                        <div className="border-t border-border pt-4 space-y-2">
                          {allAttendees.map((g, i) => (
                            <div key={i} className="text-sm font-sans">
                              <p className="text-foreground font-medium">
                                {g.name || (i === 0 ? "You" : `Guest ${i}`)}
                                {i === 0 && <span className="text-xs text-gold-dark uppercase tracking-wider ml-2">Lead booker</span>}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {menuChoices.starter.find((c) => c.value === g.starter)?.label || "No starter"} ·{" "}
                                {menuChoices.main.find((c) => c.value === g.main)?.label || "No main"} ·{" "}
                                {menuChoices.dessert.find((c) => c.value === g.dessert)?.label || "No dessert"}
                              </p>
                            </div>
                          ))}
                        </div>

                        {form.getValues("seatingPreference") && (
                          <div className="border-t border-border pt-4 text-sm font-sans">
                            <span className="text-muted-foreground">Seating: </span>
                            <span className="text-foreground">{form.getValues("seatingPreference")}</span>
                          </div>
                        )}

                        {form.getValues("dietary") && (
                          <div className="text-sm font-sans">
                            <span className="text-muted-foreground">Dietary: </span>
                            <span className="text-foreground">{form.getValues("dietary")}</span>
                          </div>
                        )}

                        {/* Cost breakdown */}
                        <div className="border-t border-border pt-4 space-y-2">
                          <div className="flex justify-between text-sm font-sans">
                            <span className="text-muted-foreground">Tickets ({totalAttendees} × £{TICKET_PRICE})</span>
                            <span className="text-foreground">£{ticketSubtotal}</span>
                          </div>
                          {drinksTotal > 0 && (
                            <div className="flex justify-between text-sm font-sans">
                              <span className="text-muted-foreground">Drinks pre-order</span>
                              <span className="text-foreground">£{drinksTotal}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-sans font-semibold border-t border-border pt-2">
                            <span className="text-foreground">Booking total</span>
                            <span className="text-gold-dark text-lg">£{grandTotal}</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment option */}
                      <div className="bg-card border border-border rounded-sm p-5 space-y-3">
                        <p className="font-sans font-medium text-foreground text-sm">Payment option</p>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="paymentOption"
                            value="full"
                            checked={paymentOption === "full"}
                            onChange={() => setPaymentOption("full")}
                            className="mt-1 accent-[hsl(var(--gold))]"
                          />
                          <span className="text-sm font-sans text-foreground">
                            <span className="font-semibold">Pay in full now</span> — £{grandTotal.toFixed(2)}
                          </span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="paymentOption"
                            value="deposit"
                            checked={paymentOption === "deposit"}
                            onChange={() => setPaymentOption("deposit")}
                            className="mt-1 accent-[hsl(var(--gold))]"
                          />
                          <span className="text-sm font-sans text-foreground">
                            <span className="font-semibold">Pay 33% deposit now</span> — £{(depositPence / 100).toFixed(2)}
                            <span className="block text-xs text-muted-foreground mt-0.5">
                              Balance of £{(balanceDuePence / 100).toFixed(2)} due by 31 July 2026 — a secure payment link will be emailed nearer the date.
                            </span>
                          </span>
                        </label>
                      </div>

                      {/* Additional message */}
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-sans text-foreground">Additional Message</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Any other requests or questions?" rows={3} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setFormStep(2)}
                          className="w-full sm:flex-1 py-4 rounded-sm text-sm font-sans uppercase tracking-widest h-auto"
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" /> Back
                        </Button>
                        <Button
                          type="submit"
                          className="w-full sm:flex-1 bg-gold-shimmer text-accent-foreground py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity h-auto"
                        >
                          <CreditCard className="w-4 h-4 mr-2" /> Continue to Payment
                        </Button>
                      </div>

                      <div className="border-t border-border pt-4 space-y-2">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" checked={coverFee} onChange={(e) => setCoverFee(e.target.checked)} className="mt-1 accent-[hsl(var(--gold))]" />
                          <span className="text-sm font-sans text-foreground">
                            Add ~2% (£{(Math.ceil(subtotalPence * 0.02) / 100).toFixed(2)}) to cover card processing fees
                          </span>
                        </label>
                        <p className="text-xs text-muted-foreground font-sans text-center">
                          You'll pay £{(totalPence / 100).toFixed(2)} securely by debit / credit card on the next step
                          {paymentOption === "deposit" && <> (deposit only — balance billed end July 2026)</>}.
                        </p>
                      </div>
                    </div>
                  )}

                </form>
              </Form>

              {showCheckout && submitted && (
                <div className="mt-6 bg-card rounded-sm border border-border shadow-lg p-5 sm:p-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-serif text-foreground">Secure Card Payment</h3>
                    <button onClick={() => setShowCheckout(false)} className="text-sm text-muted-foreground hover:text-foreground underline">
                      Back
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground font-sans">
                    Total: <strong className="text-foreground">£{(totalPence / 100).toFixed(2)}</strong>
                    {feePence > 0 && <> (includes £{(feePence / 100).toFixed(2)} card fee)</>}
                  </p>
                  <StripeEmbeddedCheckoutPanel
                    event_key="ladies_festival_2026"
                    event_label="Ladies Festival 2026 — 22 Aug"
                    contact_name={submitted.name}
                    contact_email={submitted.email}
                    contact_phone={submitted.phone}
                    cover_fee={coverFee}
                    line_items={buildLineItems()}
                    details={{
                      guestCount,
                      guests,
                      seatingPreference: submitted.seatingPreference,
                      dietary: submitted.dietary,
                      message: submitted.message,
                      wineOrders,
                      beerOrders,
                    }}
                    return_url={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
                    onError={(msg) => toast({ title: "Checkout error", description: msg, variant: "destructive" })}
                  />
                </div>
              )}
            </motion.div>
          </div>
        </section>
      </main>


      <Footer />
    </div>
  );
};

export default LadiesFestival;
