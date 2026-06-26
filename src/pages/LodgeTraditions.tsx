import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Music, Wine, Link2, Users2, Heart, Shirt, type LucideIcon } from "lucide-react";

interface Tradition {
  icon: LucideIcon;
  title: string;
  body: string;
}

const traditions: Tradition[] = [
  {
    icon: Music,
    title: "The Entered Apprentice Song",
    body: "One of the oldest musical traditions in the Craft, sung at the Festive Board in honour of a newly initiated Entered Apprentice on the evening of his Initiation. It is a moment of warmth, welcome and continuity — a song that has marked the same milestone for generations of Freemasons in Guildford and across Surrey before him.",
  },
  {
    icon: Wine,
    title: "Full Traditional Toasts",
    body: "We observe the full set of traditional Masonic toasts at our Festive Board, including the toasts to the Grand Master, the Provincial Grand Master, visiting brethren — and the Tyler's Toast, given to 'all poor and distressed Masons' wherever they may be. It is a moment of genuine reflection that closes every evening at our Masonic Lodge in Guildford.",
  },
  {
    icon: Shirt,
    title: "Dress & What to Wear",
    body: "Members wear a dark lounge suit, white shirt and dark tie, with white gloves during the ceremony. As a visitor or prospective member attending the Guildford Masonic Centre for the first time, a lounge suit is perfectly appropriate — nothing fancy, nothing you don't already own.",
  },
  {
    icon: Link2,
    title: "The Initiates' Chain",
    body: "A ceremony of welcome in which the brethren form a symbolic chain to receive a newly initiated member into the Lodge — a powerful expression of brotherhood and continuity, linking every member present to those who have gone before in our Surrey Masonic Lodge.",
  },
  {
    icon: Users2,
    title: "Visiting Other Lodges",
    body: "Weybridge Lodge has an active tradition of visiting other Lodges across Surrey, London and further afield — and of warmly welcoming visitors of our own. As a Master Mason, the whole of the Craft becomes open to you, and friendships made at our Guildford Masonic Lodge often travel far beyond the Masonic Centre.",
  },
  {
    icon: Heart,
    title: "Charitable Giving",
    body: "Charity is woven through every aspect of Lodge life. A collection is taken at each meeting, and members vote together on the causes we support — from Surrey 2030 and SANDS to local charities here in Guildford. We have earned the Surrey 2030 Festival Gold Award for our sustained giving.",
  },
];

const LodgeTraditions = () => {
  const shouldReduceMotion = useReducedMotion();

  const pageSchema = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://www.weybridgelodge.org.uk/lodge-traditions#webpage",
        url: "https://www.weybridgelodge.org.uk/lodge-traditions",
        name: "Lodge Traditions | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "Explore the living traditions of Weybridge Lodge No. 6787 — a Freemasons Lodge in Guildford, Surrey. From the Entered Apprentice Song to full Masonic toasts, discover what makes our evenings at the Guildford Masonic Centre, GU2 4DR, genuinely special.",
        inLanguage: "en-GB",
        isPartOf: { "@id": "https://www.weybridgelodge.org.uk/#website" },
      },
      breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Lodge Traditions", url: "/lodge-traditions" },
      ]),
    ],
    []
  );

  const motionProps = (delay = 0) =>
    shouldReduceMotion
      ? { initial: false, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true },
          transition: { duration: 0.5, delay },
        };

  return (
    <div className="min-h-screen">
      <SEO
        title="Lodge Traditions | Freemasons in Guildford, Surrey"
        description="Explore the living traditions of Weybridge Lodge No. 6787 — a Freemasons Lodge in Guildford, Surrey. From the Entered Apprentice Song to full Masonic toasts, discover what makes our evenings at the Guildford Masonic Centre, GU2 4DR, genuinely special."
        canonical="/lodge-traditions"
        schema={pageSchema}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />

      <main id="main-content">
        <PageHeader
          title="Our Lodge Traditions"
          subtitle="The customs and rituals that give Weybridge Lodge its character"
        />

        {/* Intro */}
        <section className="py-12 sm:py-20 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
            <motion.div {...motionProps()}>
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="font-serif text-foreground text-2xl sm:text-3xl mb-4">
                What to expect at a Freemasons Lodge in Surrey
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg">
                If you are considering joining — or simply curious about what actually happens inside a Masonic Lodge — this page is for you. Every Lodge develops its own character over time. These are the traditions at our Freemasons Lodge in Guildford that turn an evening of ceremony into something you will remember: small rituals, shared toasts, and moments of genuine warmth that no brochure fully captures.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Traditions grid */}
        <section className="py-12 sm:py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <h2 className="sr-only">Lodge traditions at Weybridge Lodge No. 6787</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {traditions.map((t, i) => {
                const Icon = t.icon;
                return (
                  <motion.article
                    key={t.title}
                    {...motionProps(i * 0.06)}
                    className="bg-card border border-border rounded-sm p-6 sm:p-7"
                  >
                    <div className="w-12 h-12 rounded-full bg-navy text-gold flex items-center justify-center border border-gold/30 mb-4">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-serif text-foreground text-xl mb-2">{t.title}</h3>
                    <p className="text-muted-foreground font-sans text-sm leading-relaxed">{t.body}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Quiz CTA */}
        <section className="py-12 sm:py-16 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
            <motion.div {...motionProps()}>
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="font-serif text-foreground text-2xl sm:text-3xl mb-4">
                Wondering if Freemasonry is right for you?
              </h2>
              <p className="text-muted-foreground font-sans mb-8 leading-relaxed">
                Our two-minute quiz helps you understand whether joining a Masonic Lodge in Surrey aligns with who you are — no commitment, no pressure, just an honest picture of what life at Weybridge Lodge No. 6787 involves.
              </p>
              <Link
                to="/quiz"
                className="inline-flex items-center justify-center bg-navy text-primary-foreground border border-gold/40 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-navy/90 transition-colors"
              >
                Take the 2-Min Quiz
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Visit CTA */}
        <section className="py-16 bg-navy">
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
            <p className="text-gold font-sans italic mb-6">
              "We meet upon the level and part upon the square."
            </p>
            <h2 className="text-2xl md:text-3xl font-serif text-primary-foreground mb-6">
              See these traditions in person at our Guildford Masonic Centre
            </h2>
            <div className="space-y-4 text-primary-foreground/70 font-sans mb-8">
              <p>
                Weybridge Lodge meets at the Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford, GU2 4DR.
              </p>
              <p>
                The best way to understand what visiting a Freemasons Lodge in Surrey is actually like is to come along. Our First Visit guide walks you through exactly what to expect.
              </p>
            </div>
            <Link
              to="/first-visit"
              className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Plan Your First Visit
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LodgeTraditions;
