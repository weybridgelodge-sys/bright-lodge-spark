import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Heart, PoundSterling, Stethoscope, Users, ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

// ─── Interface ────────────────────────────────────────────────────────────────
interface Stat {
  icon: LucideIcon;
  value: string;
  label: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const stats: Stat[] = [
  { icon: PoundSterling, value: "£1M+", label: "Raised every week by UK Freemasons" },
  { icon: Heart, value: "50%+", label: "Given to non-Masonic charities" },
  { icon: Stethoscope, value: "£5.9M+", label: "Donated to surgical research since 1967" },
  { icon: Users, value: "150+", label: "Charities supported annually by the MCF" },
];

const mcfCharities: string[] = [
  "The Freemasons' Grand Charity",
  "The Royal Masonic Trust for Girls and Boys",
  "The Royal Masonic Benevolent Institution",
  "The Masonic Samaritan Fund",
];

// ─── Component ────────────────────────────────────────────────────────────────
const FreemasonryCharity = () => {
  const shouldReduceMotion = useReducedMotion();

  const pageSchema = useMemo(() => {
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Freemasonry & Charity", url: "/freemasonry-and-charity" },
    ]);

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://weybridgelodge.org.uk/freemasonry-and-charity#webpage",
        url: "https://weybridgelodge.org.uk/freemasonry-and-charity",
        name: "Freemasonry & Charity | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "Freemasons raise nearly £1 million a week for charity. Discover how Weybridge Lodge No. 6787 and the Masonic Charitable Foundation support local and national causes across Guildford and Surrey from the Guildford Masonic Centre, GU2 4DR.",
        inLanguage: "en-GB",
        isPartOf: {
          "@id": "https://weybridgelodge.org.uk/#website",
        },
      },
      breadcrumb,
    ];
  }, []);

  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.6 },
      };

  return (
    <div className="min-h-screen">
      <SEO
        title="Freemasonry & Charity"
        description="Freemasons raise nearly £1 million a week for charity. Discover how Weybridge Lodge No. 6787 and the Masonic Charitable Foundation support local and national causes across Guildford and Surrey from the Guildford Masonic Centre, GU2 4DR."
        canonical="/freemasonry-and-charity"
        schema={pageSchema}
      />
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Freemasonry & Charity in Guildford and Surrey"
          subtitle="One of the largest private charitable donors in the United Kingdom"
        />

        {/* ── Intro ── */}
        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div {...motionProps}>
              <div className="h-0.5 w-16 bg-gold mb-6" />
              <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-6">
                Why charity is central to Freemasonry in Guildford
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg mb-6">
                What many people do not know is that Freemasonry is one of the largest charitable
                contributors in the United Kingdom. Through the generosity of Freemasons and their
                families, the Craft raises almost £1,000,000 every week for charitable causes — an
                extraordinary figure that reflects the depth of commitment across lodges like ours
                here in Guildford and throughout Surrey.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg mb-6">
                Built upon the founding precept of helping those who are less fortunate, this work
                continues today — not only for members and their dependants, but for the wider
                community. Over 50% of all funds raised go directly to non-Masonic national and
                local charities, including long-term medical research into prostate and ovarian
                cancer.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg">
                At Weybridge Lodge No. 6787, charitable giving is woven into every meeting. A
                collection is taken at each Lodge night, and members vote together on the causes we
                support — from national bodies to local charities in Guildford and across Surrey.
                We are proud holders of the Surrey 2030 Festival Gold Award for our sustained
                fundraising contribution to the Province.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="py-16 bg-navy">
          <div className="container mx-auto px-6">
            <h2 className="sr-only">Freemasonry charitable giving statistics</h2>
            <ul className="grid grid-cols-2 lg:grid-cols-4 gap-8 list-none p-0">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.li
                    key={stat.label}
                    initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
                    whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={shouldReduceMotion ? undefined : { duration: 0.5, delay: i * 0.1 }}
                    className="text-center"
                  >
                    <Icon className="w-8 h-8 text-gold mx-auto mb-3" />
                    <p className="text-3xl md:text-4xl font-serif text-gold mb-1">{stat.value}</p>
                    <p className="text-xs text-gold/60 font-sans">{stat.label}</p>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ── FFSR ── */}
        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-4xl">
            <motion.div {...motionProps}>
              <div className="h-0.5 w-16 bg-gold mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                The Freemasons' Fund for Surgical Research
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed mb-6">
                The FFSR is a charitable organisation that provides grants to Research Fellows of
                the Royal College of Surgeons (RCS England) to pursue groundbreaking medical
                research. With over fifty years of history, the fund has played a vital role in
                supporting innovation in surgical science — funded entirely by Freemasons across
                the country, including members of our Masonic Lodge in Surrey.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed">
                Since 1967, the FFSR has donated over £5.9 million to the RCS England, with the
                current value of the fund standing at approximately £7 million. Its mission is to
                support clinical research and advance surgical knowledge in ways that benefit
                patients well beyond the Masonic community.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── MCF ── */}
        <section className="py-20 md:py-28 bg-navy">
          <div className="container mx-auto px-6 max-w-4xl">
            <motion.div {...motionProps}>
              <div className="h-0.5 w-16 bg-gold mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-gold mb-6">
                The Masonic Charitable Foundation
              </h2>
              <p className="text-gold/70 font-sans leading-relaxed mb-6">
                The MCF was established to consolidate four national Masonic charities that have
                operated — under different names — since the eighteenth century:
              </p>
              <ul className="space-y-3 mb-8 list-none p-0">
                {mcfCharities.map((name) => (
                  <li key={name} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" aria-hidden="true" />
                    <span className="text-gold/70 font-sans">{name}</span>
                  </li>
                ))}
              </ul>
              <p className="text-gold/70 font-sans leading-relaxed">
                The MCF receives over 1,200 requests for grants each year, with more than 150
                charities benefitting annually. All funds are raised directly by local Lodge
                members and their families — including members of our Freemasons Lodge in
                Guildford. Contributions are always at the sole discretion of individual members.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-20 md:py-28 bg-primary text-primary-foreground">
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <motion.div {...motionProps}>
              <div className="h-0.5 w-16 bg-gold mb-6 mx-auto" />
              <h2 className="font-serif text-3xl md:text-4xl mb-4">Charity you can be part of</h2>
              <p className="font-sans leading-relaxed text-lg mb-10 opacity-90">
                Every member of Weybridge Lodge No. 6787 contributes to these causes. If you are
                considering joining a Masonic Lodge in Surrey, charitable giving is one of the most
                tangible ways your membership makes a difference.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  to="/our-charities"
                  className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  Our Local Charities
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/join-us"
                  className="inline-flex items-center justify-center border border-gold text-gold px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-gold hover:text-accent-foreground transition-colors"
                >
                  Begin Your Application
                </Link>
                <Link
                  to="/quiz"
                  className="inline-flex items-center justify-center border border-primary-foreground/40 text-primary-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-primary-foreground/10 transition-colors"
                >
                  Take the 2-Min Quiz
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

export default FreemasonryCharity;
