import { lazy, Suspense } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Footer from "@/components/Footer";
import SEO, { organizationSchema, localBusinessSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

// Below-the-fold sections — defer to keep initial JS lean for mobile LCP.
const LodgeTimeline = lazy(() => import("@/components/LodgeTimeline"));
const Principles = lazy(() => import("@/components/Principles"));
const Testimonials = lazy(() => import("@/components/Testimonials"));
const LiveEventsFeed = lazy(() => import("@/components/LiveEventsFeed"));
const NextMeeting = lazy(() => import("@/components/NextMeeting"));
const JoinCTA = lazy(() => import("@/components/JoinCTA"));
const HomepageCharityCTA = lazy(() => import("@/components/charity/HomepageCharityCTA"));

// WebPage JSON-LD node. Every other audited page carries one; Home was
// previously relying on Organization + LocalBusiness alone.
const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://www.weybridgelodge.org.uk/#webpage",
  url: "https://www.weybridgelodge.org.uk/",
  name: "Weybridge Lodge No. 6787 | Freemasons in Guildford, Surrey",
  description:
    "Weybridge Lodge No. 6787 — an open, friendly Freemasons Lodge in Guildford, Surrey. Join our welcoming community at the Guildford Masonic Centre, GU2 4DR.",
  inLanguage: "en-GB",
  isPartOf: {
    "@id": "https://www.weybridgelodge.org.uk/#website",
  },
};

const Index = () => {
  const shouldReduceMotion = useReducedMotion();

  const visionMotionProps = shouldReduceMotion
    ? { initial: false, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.6 },
      };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Weybridge Lodge No. 6787 | Freemasons in Guildford, Surrey"
        description="Weybridge Lodge No. 6787 — an open, friendly Freemasons Lodge in Guildford, Surrey. Join our welcoming community at the Guildford Masonic Centre."
        canonical="/"
        schema={[organizationSchema, localBusinessSchema, webPageSchema]}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <Hero />

        {/* ── VISION HOOK ──
            Per Vision/Mission/Values doc: Home (alongside Lodge Profile) is
            named as a page that should lead with the Vision statement as a
            strong opening hook. Placed directly after Hero, before About. */}
        <section
          className="py-14 md:py-20 bg-background"
          aria-labelledby="vision-heading"
        >
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <motion.div {...visionMotionProps}>
              <p className="text-gold text-sm font-sans uppercase tracking-wide mb-3">
                Our Vision
              </p>
              <h2
                id="vision-heading"
                className="text-xl md:text-2xl font-serif text-foreground leading-snug"
              >
                To be Guildford's most welcoming home for men seeking friendship, purpose, and
                personal growth — a Lodge where centuries-old tradition actively strengthens the
                modern Surrey community.
              </h2>
            </motion.div>
          </div>
        </section>

        <About />
        <Suspense fallback={null}>
          <HomepageCharityCTA />

          {/* Quiz invitation banner — uses the project's gold-shimmer gradient
              CTA treatment (confirmed correct site-wide, per live screenshot). */}
          <section
            className="py-12 sm:py-14 bg-card border-y border-border"
            aria-labelledby="quiz-banner-heading"
          >
            <div className="container mx-auto px-4 sm:px-6 max-w-4xl flex flex-col md:flex-row items-center justify-between gap-5 md:gap-6 text-center md:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-gold shrink-0 sm:mt-1" aria-hidden="true" />
                <div>
                  <h2 id="quiz-banner-heading" className="text-xl sm:text-2xl font-serif text-foreground">
                    Is Freemasonry for me?
                  </h2>
                  <p className="text-muted-foreground font-sans text-sm mt-1">
                    Take our short 5-question quiz for a personalised answer.
                  </p>
                </div>
              </div>
              <Link
                to="/quiz"
                aria-label="Start the 2-minute Freemasonry quiz"
                className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-5 sm:px-6 py-3 rounded-sm text-xs sm:text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity shrink-0 w-full md:w-auto min-h-[48px]"
              >
                Start the Quiz <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </section>

          <LodgeTimeline />
          <Principles />
          <Testimonials />
          <LiveEventsFeed />
          <NextMeeting />
          <JoinCTA />
        </Suspense>

      </main>
      <Footer />
    </div>
  );
};

export default Index;
