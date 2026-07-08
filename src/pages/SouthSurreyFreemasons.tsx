import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema, localBusinessSchema, faqSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Train,
  Car,
  Clock,
  Users,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface CommuterArea {
  towns: string;
  routeNote: string;
  icon: LucideIcon;
}

interface FAQItem {
  question: string;
  answer: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
// Genuine, distinct local detail per cluster — not a swapped-name template.
// Godalming rail/road figures and the Guildford station walk/taxi time, plus
// on-site parking, are confirmed directly by the Lodge. Farnham/Woking/Cranleigh
// notes remain intentionally general pending the same level of confirmation.
const commuterAreas: CommuterArea[] = [
  {
    towns: "Godalming, Milford & Haslemere",
    routeNote:
      "A quick run up the A3100 (Portsmouth Road) typically takes well under 20 minutes, and there's a direct South Western Railway service into Guildford station too — from there it's roughly a 10-minute walk or a 3-minute taxi to the Guildford Masonic Centre.",
    icon: Car,
  },
  {
    towns: "Farnham & Aldershot",
    routeNote:
      "Guildford sits a straightforward drive along the A31 from Farnham, with regular rail connections into Guildford station as well — allow a little extra time during peak rush hour.",
    icon: Train,
  },
  {
    towns: "Woking, Cranleigh & Leatherhead",
    routeNote:
      "Members joining us from Woking, Cranleigh and Leatherhead find Guildford a natural, central meeting point — closer for an evening Lodge meeting than many alternatives further into Surrey.",
    icon: Users,
  },
];

const faqItems: FAQItem[] = [
  {
    question: "Do I need to live or work exactly in Guildford to join?",
    answer:
      "Not at all. Our active members live across a broad Surrey footprint, including Woking, Farnham and Godalming. We value fellowship and commitment over your exact postcode.",
  },
  {
    question: "What time do meetings start, and is that workable after a commute?",
    answer:
      "Our four annual meetings usually start between 5.30pm and 6.00pm at the Guildford Masonic Centre, GU2 4DR — timed to work around a normal working day for members travelling in from across South Surrey.",
  },
  {
    question: "What if my train is delayed and I miss the start time?",
    answer:
      "Brotherly love and flexibility come first. While we aim to open the Lodge promptly, we're always glad to welcome commuting brethren who join us during the evening or at the Festive Board.",
  },
  {
    question: "Is there parking at the Guildford Masonic Centre?",
    answer:
      "Yes. There's on-site parking at Weybourne House, Hitherbury Close, Guildford, GU2 4DR — so if you're driving straight from work, you won't need to worry about finding a space nearby.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
const SouthSurreyFreemasons = () => {
  const shouldReduceMotion = useReducedMotion();

  const pageSchema = useMemo(() => {
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "South Surrey Freemasons", url: "/south-surrey-freemasons" },
    ]);

    const webPageSchema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": "https://weybridgelodge.org.uk/south-surrey-freemasons#webpage",
      url: "https://weybridgelodge.org.uk/south-surrey-freemasons",
      name: "Surrey Commuter Freemasons Hub | Weybridge Lodge 6787",
      description:
        "Live in Woking, Farnham or Godalming but travel via Guildford? Discover how Weybridge Lodge fits your Surrey commute and lifestyle.",
      inLanguage: "en-GB",
      isPartOf: { "@id": "https://weybridgelodge.org.uk/#website" },
    };

    const faqStructuredData = faqSchema(faqItems);

    return [webPageSchema, breadcrumb, localBusinessSchema, faqStructuredData];
  }, []);

  const motionProps = (delay = 0) =>
    shouldReduceMotion
      ? { initial: false, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-50px" },
          transition: { duration: 0.5, delay },
        };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Surrey Commuter Freemasons Hub | Weybridge Lodge 6787"
        description="Live in Woking, Farnham or Godalming but travel via Guildford? Discover how Weybridge Lodge fits your Surrey commute and lifestyle."
        canonical="/south-surrey-freemasons"
        schema={pageSchema}
      />
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Freemasonry for Men Commuting from South & West Surrey"
          subtitle="Godalming, Farnham, Haslemere and beyond — a Guildford Freemasons Lodge built around a working evening"
        />

        {/* ── Intro ── */}
        <section className="py-16 md:py-24 bg-warm-white" aria-labelledby="intro-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div {...motionProps()}>
              <div className="h-0.5 w-16 bg-gold mb-6" aria-hidden="true" />
              <h2
                id="intro-heading"
                className="text-2xl md:text-3xl font-serif text-foreground mb-6"
              >
                You don't need to live in Guildford to belong here
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg mb-4">
                A good number of our members travel in from across South Surrey — Godalming,
                Farnham, Haslemere, Cranleigh and further afield. Guildford sits centrally enough
                in the county that an evening meeting at the Guildford Masonic Centre fits
                naturally around a working day, rather than demanding a special trip.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg">
                Whether you're weighing up Freemasonry in Guildford as a South Surrey commuter or
                already searching for a Masonic Lodge in Surrey closer to home than London, this
                page sets out exactly what the journey and the evening look like.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg mt-4">
                Members who travel in from across Surrey are part of the same Lodge that raised
                over £31,000 for Farnborough SANDS —{" "}
                <a
                  href="https://weybridgelodge.org.uk/news/sands-charity"
                  className="text-gold hover:underline"
                >
                  read the full story
                </a>
                . Fellowship at Weybridge Lodge extends well beyond the meeting room.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Commuter Areas ── */}
        <section className="py-16 md:py-24 bg-navy" aria-labelledby="commute-heading">
          <div className="container mx-auto px-6">
            <motion.div {...motionProps()} className="text-center mb-14 max-w-2xl mx-auto">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2
                id="commute-heading"
                className="text-3xl md:text-4xl font-serif text-gold mb-4"
              >
                Getting to the Guildford Masonic Centre
              </h2>
              <p className="text-gold/70 font-sans">
                Weybourne House, Hitherbury Close, Guildford, GU2 4DR
              </p>
              <p className="text-gold/70 font-sans mt-2 text-sm">
                Arriving by bus? It's roughly a 10-minute walk from Guildford's Friary Bus Station.
              </p>
            </motion.div>

            <ul className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto list-none p-0">
              {commuterAreas.map((area, i) => {
                const Icon = area.icon;
                return (
                  <motion.li
                    key={area.towns}
                    {...motionProps(i * 0.1)}
                    className="p-8 rounded-sm border border-gold/10 bg-navy-light/30"
                  >
                    <div
                      className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-gold/30 mb-5"
                      aria-hidden="true"
                    >
                      <Icon className="w-6 h-6 text-gold" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-serif text-gold mb-3">{area.towns}</h3>
                    <p className="text-sm text-gold/70 font-sans leading-relaxed">
                      {area.routeNote}
                    </p>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ── Timed for the Working Day ── */}
        <section className="py-16 md:py-24 bg-background border-t border-border" aria-labelledby="timing-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div {...motionProps()}>
              <div className="h-0.5 w-16 bg-gold mb-6" aria-hidden="true" />
              <div className="flex items-start gap-4 mb-6">
                <Clock className="w-7 h-7 text-gold shrink-0 mt-1" aria-hidden="true" />
                <h2
                  id="timing-heading"
                  className="text-2xl md:text-3xl font-serif text-foreground"
                >
                  Perfectly timed for an after-work arrival
                </h2>
              </div>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg mb-4">
                We hold four meetings a year, usually starting between 5.30pm and 6.00pm — a
                deliberately practical start time for members finishing a working day in
                Godalming, Farnham or anywhere else across Surrey before heading to Guildford.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg">
                Each meeting is followed by the Festive Board, a three-course dinner with the
                brethren — so an evening at Weybridge Lodge doubles as both ceremony and a proper
                social occasion, worth the journey in from across the county.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-16 md:py-24 bg-warm-white border-t border-border" aria-labelledby="faq-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div {...motionProps()} className="mb-10">
              <div className="h-0.5 w-16 bg-gold mb-6" aria-hidden="true" />
              <h2 id="faq-heading" className="text-2xl md:text-3xl font-serif text-foreground">
                Common questions from South Surrey enquirers
              </h2>
            </motion.div>
            <motion.div {...motionProps(0.1)}>
              <Accordion type="single" collapsible className="space-y-3">
                {faqItems.map((faq, i) => (
                  <AccordionItem
                    key={faq.question}
                    value={`item-${i}`}
                    className="border border-border rounded-sm px-6 bg-card"
                  >
                    <AccordionTrigger className="text-left font-serif text-foreground hover:text-gold transition-colors min-h-[48px]">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground font-sans leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* ── Final CTA — Hub 1 rule: primary link goes to Join Us ── */}
        <section className="py-16 md:py-20 bg-navy" aria-labelledby="commuter-cta-heading">
          <div className="container mx-auto px-6 max-w-2xl text-center">
            <motion.div {...motionProps()}>
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2
                id="commuter-cta-heading"
                className="font-serif text-gold text-2xl md:text-3xl mb-3"
              >
                Guildford is closer than you think
              </h2>
              <p className="text-gold/70 font-sans mb-8">
                If the commute was your last hesitation, take the next step — begin your
                application to Weybridge Lodge No. 6787, or see what a first visit actually
                involves.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  to="/join-us"
                  aria-label="Begin your application to join Weybridge Lodge No. 6787 in Guildford"
                  className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Begin Your Application
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/first-visit"
                  aria-label="Learn what to expect on your initiation night"
                  className="inline-flex items-center justify-center bg-transparent text-gold border border-gold/40 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Your Initiation Night
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

export default SouthSurreyFreemasons;
