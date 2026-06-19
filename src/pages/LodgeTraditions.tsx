import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Music, Wine, Link2, Users2, Heart, Shirt } from "lucide-react";

const traditions = [
  {
    icon: Music,
    title: "The Entered Apprentice Song",
    body: "One of the oldest musical traditions in the Craft, sung at the Festive Board in honour of a newly initiated Entered Apprentice on the evening of his Initiation. It is a moment of warmth, welcome and continuity — a song that has marked the same milestone for generations of Freemasons before him.",
  },
  {
    icon: Wine,
    title: "Full Traditional Toasts",
    body: "We observe the full set of traditional Masonic toasts at our Festive Board, including the toasts to the Grand Master, the Provincial Grand Master, visiting brethren — and the Tyler's Toast, given to 'all poor and distressed Masons' wherever they may be. It's a moment of genuine reflection that closes every evening.",
  },
  {
    icon: Link2,
    title: "The Initiates' Chain",
    body: "A ceremony of welcome in which the brethren form a symbolic chain to receive a newly initiated member into the Lodge — a powerful expression of brotherhood and continuity, linking every member present to those who have gone before.",
  },
  {
    icon: Users2,
    title: "Visiting Other Lodges",
    body: "Weybridge Lodge has an active tradition of visiting other Lodges across Surrey, London and further afield — and of warmly welcoming visitors of our own. As a newly initiated Mason, the whole of the Craft becomes open to you, and friendships made here often travel far beyond the Masonic Centre.",
  },
  {
    icon: Heart,
    title: "Charitable Giving",
    body: "Charity is woven through every aspect of Lodge life. A collection is taken at each meeting, and members vote together on the causes we support — from Surrey 2030 and SANDS to local charities in Guildford. We've earned the Surrey 2030 Festival Gold Award for our sustained giving.",
  },
  {
    icon: Shirt,
    title: "Dress & Regalia",
    body: "Members wear a dark lounge suit, white shirt and dark tie, with white gloves during the ceremony. As a visitor or prospective member, a lounge suit is perfectly appropriate — nothing fancy, nothing you don't already own.",
  },
];

const LodgeTraditions = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Lodge Traditions"
        description="The traditions of Weybridge Lodge No. 6787 — the Entered Apprentice Song, full Masonic toasts, the Initiates' Chain, visiting other Lodges, and the customs that make our evenings special."
        canonical="/lodge-traditions"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Lodge Traditions", url: "/lodge-traditions" },
        ])}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Our Lodge Traditions"
          subtitle="The customs and rituals that give Weybridge Lodge its character"
        />

        <section className="py-12 sm:py-20 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <p className="text-muted-foreground font-sans leading-relaxed text-lg">
                Every Lodge develops its own customs over time. These are the traditions of which Weybridge Lodge is particularly proud — small rituals and shared moments that turn an evening of ceremony into something genuinely memorable.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-12 sm:py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <div className="grid sm:grid-cols-2 gap-6">
              {traditions.map((t, i) => {
                const Icon = t.icon;
                return (
                  <motion.div
                    key={t.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.06 }}
                    className="bg-card border border-border rounded-sm p-6 sm:p-7"
                  >
                    <div className="w-12 h-12 rounded-full bg-navy text-gold flex items-center justify-center border border-gold/30 mb-4">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <h2 className="font-serif text-foreground text-xl mb-2">{t.title}</h2>
                    <p className="text-muted-foreground font-sans text-sm leading-relaxed">{t.body}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 bg-navy">
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
            <p className="text-gold font-sans italic mb-6">"We meet upon the level and part upon the square."</p>
            <h2 className="text-2xl md:text-3xl font-serif text-primary-foreground mb-4">
              Come and experience it for yourself
            </h2>
            <p className="text-primary-foreground/70 font-sans mb-8">
              The best way to understand our traditions is to see them in person at a Festive Board.
            </p>
            <Link
              to="/first-visit"
              className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Your Initiation Night
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LodgeTraditions;
