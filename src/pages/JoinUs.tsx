import { useEffect, useMemo, useState } from "react";
import { joinUsCostAmounts, fetchJoinUsCostRow } from "@/lib/joinUsCosts";
import { useLodgeFigures, ageRangePhrase } from "@/lib/lodgeFigures";
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
  HeartHandshake,
  GraduationCap,
  HandHelping,
  CalendarCheck,
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

interface ProfilePoint {
  icon: LucideIcon;
  text: string;
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

const buildCostCards = (amounts: ReturnType<typeof joinUsCostAmounts>): CostCard[] => [
  {
    icon: PoundSterling,
    title: "UGLE Registration",
    amount: amounts.ugle, // Treasurer-saved default (lodge_fee_settings), typed fallback
    note: "A one-off fee paid to the United Grand Lodge of England when you are initiated.",
    badge: "50% off for under-25s",
  },
  {
    icon: CalendarDays,
    title: "Annual Subscription",
    amount: amounts.dues,
    note: "Pro-rated based on when you join during the Lodge year.",
    badge: "50% off for under-25s",
  },
  {
    icon: Utensils,
    title: "Dining at Meetings",
    amount: amounts.dining,
    note: "A proper three-course dinner with the brethren at the Festive Board after every Lodge meeting.",
  },
  {
    icon: Ticket,
    title: "Incidentals",
    amount: "A few pounds",
    note: "Raffle tickets, drinks at the bar, and other optional extras on the night — entirely your choice.",
  },
];

/** "our members currently range from X to Y" clause, omitted when the figures are unknown. */
export const buildProfilePoints = (ages: string): ProfilePoint[] => [
  {
    icon: MapPin,
    text: `You're a man of any adult age${ages ? ` — our members currently range ${ages} —` : ""} living in or near Guildford, Woking, Godalming, Farnham, Cranleigh or Leatherhead.`,
  },
  {
    icon: HeartHandshake,
    text: "You're looking for genuine friendship, not networking — a real connection rather than a professional or transactional angle.",
  },
  {
    icon: GraduationCap,
    text: "You're drawn to self-improvement through structure, ceremony and mentorship from those who've walked the path before you.",
  },
  {
    icon: HandHelping,
    text: "You're community-minded, with a natural pull toward charitable giving and volunteering in Guildford and across Surrey.",
  },
  {
    icon: Compass,
    text: "You're comfortable with tradition and ritual — even brand new to it. Curiosity matters far more than prior knowledge.",
  },
  {
    icon: CalendarCheck,
    text: "You're willing to commit time: regular Lodge meetings, the Festive Board afterward, and genuinely progressing through the three degrees.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
const JoinUs = () => {
  const ages = ageRangePhrase(useLodgeFigures());
  const profilePoints = useMemo(() => buildProfilePoints(ages), [ages]);
  const [costRow, setCostRow] = useState<Parameters<typeof joinUsCostAmounts>[0]>(null);
  useEffect(() => {
    let cancelled = false;
    fetchJoinUsCostRow().then((row) => { if (!cancelled && row) setCostRow(row); }, () => {});
    return () => { cancelled = true; };
  }, []);
  const costCards = useMemo(() => buildCostCards(joinUsCostAmounts(costRow)), [costRow]);

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
        "@id": "https://weybridgelodge.org.uk/join-us#webpage",
        url: "https://weybridgelodge.org.uk/join-us",
        name: "Join the Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "Interested in becoming a Freemason in Guildford or Surrey? Join Weybridge Lodge No. 6787 at the Guildford Masonic Centre, GU2 4DR. Contact our Membership Secretary to start your Masonic journey today.",
        inLanguage: "en-GB",
        isPartOf: { "@id": "https://weybridgelodge.org.uk/#website" },
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
                        href="tel:+447921589039"
                        className="text-gold-dark hover:text-navy font-sans transition-colors text-sm min-h-[48px] inline-flex items-center"
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
                        className="text-gold-dark hover:text-navy font-sans transition-colors text-sm break-all min-h-[48px] inline-flex items-center"
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
                className="text-gold-dark font-medium min-h-[48px] inline-flex items-center underline underline-offset-4"
              >
                See how the journey works
              </Link>
            </p>

            {/* ── Secondary CTAs ── */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center mt-12">
              <Link
                to="/freemason-initiation-night"
                aria-label="Learn what to expect on your initiation night"
                className="inline-flex items-center justify-center border border-gold-dark text-gold-dark px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:bg-gold hover:text-navy transition-colors min-h-[48px]"
              >
                Your Initiation Night
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Link>
              <Link
                to="/your-journey"
                aria-label="See the full member journey timeline"
                className="inline-flex items-center justify-center border border-gold-dark text-gold-dark px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:bg-gold hover:text-navy transition-colors min-h-[48px]"
              >
                <Compass className="w-4 h-4 mr-2" aria-hidden="true" />
                Journey Timeline
              </Link>
              <Link
                to="/faq"
                aria-label="Read frequently asked questions about joining"
                className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold-dark transition-colors min-h-[48px]"
              >
                Frequently Asked Questions
              </Link>
            </div>
          </div>
        </section>

        {/* ── Is This You? — soft self-assessment, not a hard gate ── */}
        <section
          className="py-12 sm:py-20 md:py-24 bg-background border-t border-border"
          aria-labelledby="is-this-you-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <motion.div {...motionProps()} className="text-center mb-12">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2
                id="is-this-you-heading"
                className="text-3xl md:text-4xl font-serif text-foreground mb-4"
              >
                Is This You?
              </h2>
              <p className="text-muted-foreground font-sans max-w-2xl mx-auto leading-relaxed">
                There's no single "type" who joins Freemasons in Guildford — but most of our members
                recognise a little of themselves in the list below before they ever pick up the phone.
              </p>
            </motion.div>

            <ul className="grid sm:grid-cols-2 gap-5 list-none p-0 m-0">
              {profilePoints.map(({ icon: Icon, text }, i) => (
                <motion.li
                  key={text}
                  {...motionProps(i * 0.06)}
                  className="flex items-start gap-4 bg-card border border-border rounded-sm p-5"
                >
                  <span
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gold-light/40 shrink-0"
                    aria-hidden="true"
                  >
                    <Icon className="w-5 h-5 text-gold-dark" aria-hidden="true" />
                  </span>
                  <span className="text-foreground font-sans text-sm leading-relaxed pt-1.5">
                    {text}
                  </span>
                </motion.li>
              ))}
            </ul>

            <motion.div {...motionProps(0.3)} className="text-center mt-10">
              <p className="text-muted-foreground font-sans text-sm max-w-2xl mx-auto mb-4">
                New to Freemasonry entirely, with no family connection and no one to vouch for you?
                That's absolutely fine — curiosity matters far more than prior knowledge. Weybridge
                Lodge openly welcomes enquiries; we're a Masonic Lodge in Surrey, not a closed,
                invitation-only circle.{" "}
                <Link to="/faq" className="text-gold-dark font-medium underline underline-offset-4">
                  See who can join on our FAQ page
                </Link>
                .
              </p>
              <Link
                to="/quiz"
                className="inline-flex items-center gap-2 text-sm font-sans font-semibold text-gold-dark uppercase tracking-widest min-h-[48px] underline underline-offset-4"
              >
                Not sure yet? Take the 2-Min Quiz
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </motion.div>
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
              <p className="text-primary-foreground/80 font-sans max-w-2xl mx-auto mb-8 leading-relaxed">
                Take our two-minute quiz to see whether joining a Masonic Lodge in Surrey feels right
                for you — no commitment, no details required, just an honest picture of what
                membership at Weybridge Lodge No. 6787 involves.
              </p>
              <Link
                to="/quiz"
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
                  <p className="text-xl font-serif text-gold-dark mb-3 whitespace-nowrap">{amount}</p>
                  <p className="text-muted-foreground font-sans text-sm leading-relaxed flex-1">
                    {note}
                  </p>
                  {badge && (
                    <p className="mt-4 inline-flex self-start text-sm font-sans uppercase tracking-widest text-gold-dark border border-gold/40 px-2 py-1 rounded-sm text-center">
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

        {/* ── FAQ callout — /faq is the canonical FAQ resource ── */}
        <section
          className="py-14 md:py-16 bg-warm-white border-t border-border"
          aria-labelledby="join-faq-callout-heading"
        >
          <div className="container mx-auto px-6 max-w-2xl">
            <motion.div
              {...motionProps()}
              className="border border-border rounded-sm bg-card px-6 py-8 text-center"
            >
              <h2
                id="join-faq-callout-heading"
                className="text-xl md:text-2xl font-serif text-foreground mb-3"
              >
                Have more questions?
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed mb-6">
                Costs, who can join, what happens after your enquiry, how long the process takes —
                all answered in one place.
              </p>
              <Link
                to="/faq"
                className="inline-flex items-center justify-center gap-2 border border-gold-dark text-gold-dark px-6 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-gold hover:text-navy transition-colors min-h-[48px]"
              >
                See the Full FAQ
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </motion.div>
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
              <p className="text-primary-foreground/80 font-sans max-w-xl mx-auto mb-8 leading-relaxed">
                We would be delighted to hear from you. No paperwork, no pressure — just a friendly
                chat about joining our Freemasons Lodge in Guildford.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href="tel:+447921589039"
                  className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  Call 07921 589 039
                </a>
                <a
                  href="mailto:secretary@weybridgelodge.org.uk?subject=Weybridge%20Lodge%20Website%20Enquiry"
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
