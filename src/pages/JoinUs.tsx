import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  PoundSterling,
  CalendarDays,
  Utensils,
  Ticket,
  ArrowRight,
  Compass,
  type LucideIcon,
} from "lucide-react";
import EnquiryForm from "@/components/EnquiryForm";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface CostCard {
  icon: LucideIcon;
  title: string;
  amount: string;
  note: string;
  badge?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const reasons: string[] = [
  "Make lifelong friendships with like-minded men",
  "Be part of a global network of over 6 million members",
  "Support charitable causes in your local Guildford community",
  "Develop leadership and personal skills over time",
  "Enjoy a rich social calendar with family events throughout the year",
  "Become part of a tradition in Surrey dating back centuries",
];

const costCards: CostCard[] = [
  {
    icon: PoundSterling,
    title: "UGLE Registration",
    amount: "£132",
    note: "A one-off fee paid to the United Grand Lodge of England when you are initiated.",
    badge: "50% off for under-21s",
  },
  {
    icon: CalendarDays,
    title: "Annual Subscription",
    amount: "£250 / year",
    note: "Pro-rated based on when you join during the Lodge year.",
    badge: "50% off for under-21s",
  },
  {
    icon: Utensils,
    title: "Dining at Meetings",
    amount: "~£32 per meeting",
    note: "A proper three-course dinner with the brethren at the Festive Board after every Lodge meeting.",
  },
  {
    icon: Ticket,
    title: "Incidentals",
    amount: "A few pounds",
    note: "Raffle tickets, drinks at the bar, and other optional extras on the night — entirely your choice.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
const JoinUs = () => {
  const shouldReduceMotion = useReducedMotion();

  const pageSchema = useMemo(() => {
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Join Us", url: "/join-us" },
    ]);

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://www.weybridgelodge.org.uk/join-us#webpage",
        url: "https://www.weybridgelodge.org.uk/join-us",
        name: "Join the Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "Interested in becoming a Freemason in Guildford or Surrey? Join Weybridge Lodge No. 6787 at the Guildford Masonic Centre, GU2 4DR. Contact our Membership Secretary to start your Masonic journey today.",
        inLanguage: "en-GB",
        isPartOf: { "@id": "https://www.weybridgelodge.org.uk/#website" },
      },
      breadcrumb,
    ];
  }, []);

  const motionProps = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true },
          transition: { duration: 0.5, delay },
        };

  const slideProps = (dir: "left" | "right", delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, x: dir === "left" ? -20 : 20 },
          whileInView: { opacity: 1, x: 0 },
          viewport: { once: true },
          transition: { duration: 0.6, delay },
        };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Join Freemasons in Guildford"
        description="Interested in becoming a Freemason in Guildford or Surrey? Join Weybridge Lodge No. 6787 at the Guildford Masonic Centre, GU2 4DR. Contact our Membership Secretary to start your Masonic journey today."
        canonical="/join-us"
        schema={pageSchema}
      />
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Join Freemasons in Guildford, Surrey"
          subtitle="How to begin your journey with Weybridge Lodge No. 6787"
        />

        {/* ── Why Join + Contact Card ── */}
        <section
          className="py-12 sm:py-20 md:py-28 bg-warm-white"
          aria-labelledby="why-join-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="grid md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 items-start min-w-0">
              {/* Why Join Column */}
              <motion.div {...slideProps("left")} className="min-w-0">
                <div className="h-0.5 w-16 bg-gold mb-6" aria-hidden="true" />
                <h2 id="why-join-heading" className="text-3xl md:text-4xl font-serif text-foreground mb-6 break-words">
                  Why join Freemasonry?
                </h2>
                <p className="text-muted-foreground font-sans leading-relaxed mb-8 break-words">
                  Freemasonry offers a unique experience that enriches lives. Whether you are looking
                  for fellowship, personal growth, or the chance to give back to your community in
                  Guildford and across Surrey, membership opens doors to extraordinary opportunities.
                </p>
                <ul className="space-y-4 list-none p-0 m-0">
                  {reasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-3 min-w-0">
                      <CheckCircle className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <span className="text-foreground font-sans text-sm break-words min-w-0">{reason}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Contact Card Column */}
              <motion.div
                {...slideProps("right", 0.2)}
                className="bg-card rounded-sm border border-border shadow-lg p-5 sm:p-8 min-w-0"
              >
                <h2 className="text-xl font-serif text-foreground mb-6">Get in touch</h2>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Phone className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-sans font-medium text-foreground text-sm">
                        Call our Membership Secretary
                      </p>
                      <a
                        href="tel:07921589039"
                        className="text-gold hover:text-gold/80 font-sans transition-colors text-sm min-h-[48px] inline-flex items-center"
                        aria-label="Call Weybridge Lodge Membership Secretary"
                      >
                        07921 589 039
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Mail className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-sans font-medium text-foreground text-sm">Email us</p>
                      <a
                        href="mailto:secretary@weybridgelodge.org.uk?subject=Weybridge%20Lodge%20Website%20Enquiry"
                        className="text-gold hover:text-gold/80 font-sans transition-colors text-sm break-all min-h-[48px] inline-flex items-center"
                        aria-label="Email Weybridge Lodge secretary"
                      >
                        secretary@weybridgelodge.org.uk
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-sans font-medium text-foreground text-sm">We meet at</p>
                      <p className="text-muted-foreground font-sans text-sm leading-relaxed">
                        Guildford Masonic Centre
                        <br />
                        Weybourne House, Hitherbury Close
                        <br />
                        Guildford, GU2 4DR
                      </p>
                    </div>
                  </div>
                </div>

                <EnquiryForm />
              </motion.div>
            </div>

            {/* ── Commuter cross-link ── */}
            <p className="text-center font-sans text-sm text-muted-foreground mt-8">
              Commuting from Godalming, Farnham or Woking?{" "}
              <Link
                to="/south-surrey-freemasons"
                aria-label="See how the commute to Guildford works for South Surrey members"
                className="text-gold hover:underline font-medium min-h-[48px] inline-flex items-center"
              >
                See how the journey works
              </Link>
            </p>

            {/* ── Secondary CTAs ── */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center mt-12">
              <Link
                to="/first-visit"
                aria-label="Learn what to expect on your initiation night"
                className="inline-flex items-center justify-center border border-gold text-gold px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:bg-gold hover:text-navy transition-colors min-h-[48px]"
              >
                Your Initiation Night
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Link>
              <Link
                to="/your-journey"
                aria-label="See the full member journey timeline"
                className="inline-flex items-center justify-center border border-gold text-gold px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:bg-gold hover:text-navy transition-colors min-h-[48px]"
              >
                <Compass className="w-4 h-4 mr-2" aria-hidden="true" />
                Journey Timeline
              </Link>
              <Link
                to="/faq"
                aria-label="Read frequently asked questions about joining"
                className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors min-h-[48px]"
              >
                Frequently Asked Questions
              </Link>
            </div>
          </div>
        </section>

        {/* ── Soft-Conversion Quiz Strip ── */}
        <section className="py-12 sm:py-16 bg-navy" aria-labelledby="quiz-strip-heading">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <motion.div {...motionProps()} className="text-center">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2 id="quiz-strip-heading" className="text-2xl md:text-3xl font-serif text-gold mb-4">
                Not quite ready to get in touch?
              </h2>
              <p className="text-gold/80 font-sans max-w-2xl mx-auto mb-8 leading-relaxed">
                Take our two-minute quiz to see whether joining a Masonic Lodge in Surrey feels right
                for you — no commitment, no details required, just an honest picture of what
                membership at Weybridge Lodge No. 6787 involves.
              </p>
              <Link
                to="/quiz"
                aria-label="Take the 2-minute Freemasonry quiz"
                className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px]"
              >
                Take the 2-Min Quiz
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ── Costs & Commitment ── */}
        <section className="py-12 sm:py-20 md:py-24 bg-background" aria-labelledby="costs-heading">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <motion.div {...motionProps()} className="text-center mb-12">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2 id="costs-heading" className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                Costs &amp; Commitment
              </h2>
              <p className="text-muted-foreground font-sans max-w-2xl mx-auto">
                We believe in being upfront. Here is exactly what membership of our Freemasons Lodge
                in Guildford costs — no surprises, no hidden fees.
              </p>
            </motion.div>

            <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 list-none p-0 m-0">
              {costCards.map(({ icon: Icon, title, amount, note, badge }, i) => (
                <motion.li
                  key={title}
                  {...motionProps(i * 0.08)}
                  className="bg-card border border-border rounded-sm p-6 flex flex-col"
                >
                  <Icon className="w-6 h-6 text-gold mb-3" aria-hidden="true" />
                  <h3 className="font-serif text-foreground text-lg mb-1">{title}</h3>
                  <p className="text-xl font-serif text-gold mb-3 whitespace-nowrap">{amount}</p>
                  <p className="text-muted-foreground font-sans text-sm leading-relaxed flex-1">
                    {note}
                  </p>
                  {badge && (
                    <p className="mt-4 inline-flex self-start text-xs font-sans uppercase tracking-widest text-gold border border-gold/40 px-2 py-1 rounded-sm text-center">
                      {badge}
                    </p>
                  )}
                </motion.li>
              ))}
            </ul>

            <p className="text-center text-muted-foreground font-sans text-sm mt-10 max-w-2xl mx-auto">
              Time-wise, we meet on a handful of evenings each year — easy to fit around work and
              family life. There is no expectation to attend every social event, though most members
              of our Masonic Lodge in Surrey find they want to.
            </p>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-12 sm:py-16 bg-navy" aria-labelledby="final-cta-heading">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <motion.div {...motionProps()} className="text-center">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2 id="final-cta-heading" className="text-2xl md:text-3xl font-serif text-gold mb-4">
                Ready to start the conversation?
              </h2>
              <p className="text-gold/80 font-sans max-w-xl mx-auto mb-8 leading-relaxed">
                We would be delighted to hear from you. No paperwork, no pressure — just a friendly
                chat about joining our Freemasons Lodge in Guildford.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href="tel:07921589039"
                  aria-label="Call Weybridge Lodge Membership Secretary to begin your application"
                  className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  Call 07921 589 039
                </a>
                <a
                  href="mailto:secretary@weybridgelodge.org.uk?subject=Weybridge%20Lodge%20Website%20Enquiry"
                  aria-label="Email Weybridge Lodge to begin your application"
                  className="inline-flex items-center justify-center gap-2 bg-transparent text-gold border border-gold/40 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  Email the Secretary
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default JoinUs;
