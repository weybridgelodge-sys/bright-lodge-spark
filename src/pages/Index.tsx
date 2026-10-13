import { lazy, Suspense } from "react";
import { PageLoader } from "@/components/AppErrorBoundary";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Footer from "@/components/Footer";
import SEO, { organizationSchema, localBusinessSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, Route as RouteIcon, DoorOpen, ArrowRight } from "lucide-react";

const LodgeTimeline = lazy(() => import("@/components/LodgeTimeline"));
const Principles = lazy(() => import("@/components/Principles"));
const Testimonials = lazy(() => import("@/components/Testimonials"));
const LiveEventsFeed = lazy(() => import("@/components/LiveEventsFeed"));
const NextMeeting = lazy(() => import("@/components/NextMeeting"));
const JoinCTA = lazy(() => import("@/components/JoinCTA"));
const HomepageCharityCTA = lazy(() => import("@/components/charity/HomepageCharityCTA"));

const PAGE_TITLE = "Freemasons in Guildford, Surrey | Weybridge Lodge No. 6787";
const PAGE_DESC =
  "Weybridge Lodge No. 6787: a friendly Masonic Lodge in Surrey meeting in Guildford GU2 4DR. Take the 2-minute quiz, see your journey and how to join.";

const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://weybridgelodge.org.uk/#webpage",
  url: "https://weybridgelodge.org.uk/",
  name: PAGE_TITLE,
  description: PAGE_DESC,
  inLanguage: "en-GB",
  isPartOf: { "@id": "https://weybridgelodge.org.uk/#website" },
  about: { "@id": "https://weybridgelodge.org.uk/#organization" },
};

const steps = [
  {
    to: "/quiz",
    icon: Sparkles,
    kicker: "2 minutes",
    title: "Is Freemasonry for me?",
    body: "Answer a few quick questions for a personal, no-pressure answer.",
    cta: "Take the quiz",
  },
  {
    to: "/your-journey",
    icon: RouteIcon,
    kicker: "Step by step",
    title: "See your journey",
    body: "From first conversation to membership: what happens, and when.",
    cta: "View the journey",
  },
  {
    to: "/freemason-initiation-night",
    icon: DoorOpen,
    kicker: "First visit guide",
    title: "What your first night is like",
    body: "Where to park, what to wear and who you'll meet at Guildford Masonic Centre.",
    cta: "Read the guide",
  },
];

const Index = () => {
  const shouldReduceMotion = useReducedMotion();

  const fadeUp = shouldReduceMotion
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
        title={PAGE_TITLE}
        description={PAGE_DESC}
        canonical="/"
        schema={[organizationSchema, localBusinessSchema, webPageSchema]}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <Hero />

        {/* Vision hook */}
        <section className="py-14 md:py-20 bg-background" aria-labelledby="vision-heading">
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <motion.div {...fadeUp}>
              <p className="text-gold-dark text-sm font-sans uppercase tracking-wide mb-3">Our Vision</p>
              <h2 id="vision-heading" className="text-2xl md:text-3xl font-serif text-foreground mb-5">
                A welcoming Masonic Lodge in Surrey
              </h2>
              <p className="text-lg md:text-xl font-serif text-muted-foreground leading-snug">
                To be Guildford's most welcoming home for men seeking friendship, purpose, and
                personal growth — a Lodge where centuries-old tradition actively strengthens the
                modern Surrey community.
              </p>
            </motion.div>
          </div>
        </section>

        <About />

        <Suspense fallback={<PageLoader />}>
          <HomepageCharityCTA />

          {/* Soft-conversion row: Quiz, Journey, First Visit Guide */}
          <section className="py-14 md:py-20 bg-card border-y border-border" aria-labelledby="next-steps-heading">
            <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
              <div className="text-center mb-10">
                <h2 id="next-steps-heading" className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                  Curious about Freemasons in Guildford?
                </h2>
                <p className="text-muted-foreground font-sans max-w-2xl mx-auto">
                  No commitment, no pressure. Start wherever feels comfortable.
                </p>
              </div>

              <ul className="grid gap-4 md:grid-cols-3 list-none p-0 m-0">
                {steps.map(({ to, icon: Icon, kicker, title, body, cta }) => (
                  <li key={to} className="flex">
                    <Link
                      to={to}
                      className="group flex flex-col w-full min-h-[48px] p-6 bg-background border border-border rounded-sm hover:border-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <Icon className="w-7 h-7 text-gold mb-4" aria-hidden="true" />
                      <span className="text-gold-dark text-sm font-sans uppercase tracking-widest mb-2">{kicker}</span>
                      <h3 className="text-xl font-serif text-foreground mb-2">{title}</h3>
                      <p className="text-sm font-sans text-muted-foreground leading-relaxed mb-5">{body}</p>
                      <span className="mt-auto inline-flex items-center gap-2 text-sm font-sans font-semibold uppercase tracking-widest text-foreground group-hover:text-gold-dark transition-colors">
                        {cta}
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="text-center text-sm font-sans text-muted-foreground mt-8">
                Live elsewhere in the county?{" "}
                <Link to="/south-surrey-freemasons" className="text-foreground underline underline-offset-4 hover:text-gold-dark inline-block py-2">
                  Freemasons in South Surrey
                </Link>
              </p>
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
