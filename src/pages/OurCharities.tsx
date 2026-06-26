import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import OurCharitiesLiveFeed from "@/components/charity/OurCharitiesLiveFeed";
import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import sandsLogo from "@/assets/links/sands-logo.jpg";
import tlcLogo from "@/assets/links/tlc-logo.ico";
import surrey2030Logo from "@/assets/surrey-2030-gold.png";
import thamesChallengeImgRaw from "@/assets/thames-challenge/tc-source-stone.jpg.asset.json";

// ─── Type-safe asset fallback ─────────────────────────────────────────────────
// The .asset.json import may not have a .url property at runtime if the
// asset pipeline hasn't resolved it. The fallback string prevents a broken
// <img> src silently rendering a broken image on the page.
const thamesChallengeImg =
  (thamesChallengeImgRaw as { url?: string })?.url ?? "";

// ─── Interface ────────────────────────────────────────────────────────────────
interface Charity {
  name: string;
  highlight: string;
  description: string;
  url: string;
  postUrl?: string;
  logo: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const charities: Charity[] = [
  {
    name: "Surrey 2030 Festival — Masonic Charitable Foundation",
    highlight: "Gold Festival Award achieved",
    description:
      "Weybridge Lodge has officially secured the prestigious Gold Festival Award for the Surrey 2030 Festival, raising over £15,800 for the Masonic Charitable Foundation in just five months. The Festival supports life-changing grants for individuals and families in times of need, funding medical treatment, education, and daily living assistance.",
    url: "https://surreymason.org.uk/surrey-2030-festival/",
    postUrl: "/news/surrey-2030-festival-gold",
    logo: surrey2030Logo,
  },
  {
    name: "Farnborough SANDS",
    highlight: "Our largest donation to date",
    description:
      "Weybridge Lodge made their largest charitable donation to date — £31,331.15 — to SANDS, a charity supporting parents affected by stillbirth or neonatal death. This was a unanimous decision by the members of our Masonic Lodge in Guildford, reflecting the depth of feeling within the Lodge for families facing unimaginable loss.",
    url: "https://www.farnboroughsands.co.uk/",
    postUrl: "/news/sands-charity",
    logo: sandsLogo,
  },
  {
    name: "TLC Appeal Surrey — Teddies For Loving Care",
    highlight: "Lodge and Chapter Patron Programme — Gold Patron",
    description:
      "Weybridge Lodge No. 6787 has committed to support TLC Appeal Surrey for the next five years as a Gold Patron. This year TLC are on track to deliver over 14,000 bears to 10 A&E departments across Surrey, as well as supporting I Choose Freedom and the Royal Marsden Children's Cancer Ward.",
    url: "https://tlcappealsurrey.org.uk/",
    logo: tlcLogo,
  },
];

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay },
  }),
  static: { opacity: 1, y: 0 },
};

// ─── Component ────────────────────────────────────────────────────────────────
const OurCharities = () => {
  const shouldReduceMotion = useReducedMotion();

  const pageSchema = useMemo(() => {
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Freemasonry & Charity", url: "/freemasonry-and-charity" },
      { name: "Our Charities", url: "/our-charities" },
    ]);

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://www.weybridgelodge.org.uk/our-charities#webpage",
        url: "https://www.weybridgelodge.org.uk/our-charities",
        name: "Our Charities | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "Weybridge Lodge No. 6787 supports SANDS, TLC Appeal Surrey, and the Surrey 2030 Festival. See how Freemasons in Guildford give back to their community from the Guildford Masonic Centre, GU2 4DR.",
        inLanguage: "en-GB",
        isPartOf: {
          "@id": "https://www.weybridgelodge.org.uk/#website",
        },
      },
      breadcrumb,
    ];
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Our Charities | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787"
        description="Weybridge Lodge No. 6787 supports SANDS, TLC Appeal Surrey, and the Surrey 2030 Festival. See how Freemasons in Guildford, Surrey give back to their community."
        canonical="/our-charities"
        type="website"
        schema={pageSchema}
      />

      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Header />

      <main id="main-content">

        {/* ── H1 — geo-anchored ── */}
        <PageHeader
          title="Charitable Giving by Freemasons in Guildford — Our Supported Causes"
          subtitle="Tens of thousands of pounds raised collectively and individually by Weybridge Lodge No. 6787 for causes that matter"
        />

        {/* ── Intro ── */}
        <section
          className="py-20 md:py-28 bg-background"
          aria-labelledby="charities-intro-heading"
        >
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={0}
            >
              <div className="h-px w-16 bg-gold mb-6" aria-hidden="true" />
              <h2
                id="charities-intro-heading"
                className="font-serif text-foreground text-2xl md:text-3xl mb-6"
              >
                How our Masonic Lodge in Surrey raises and gives
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg mb-6">
                Charity sits at the heart of every Freemason and Masonic Lodge, and Weybridge Lodge
                No. 6787 is no different. As a Lodge, tens of thousands of pounds are raised both
                collectively and individually through Gala Dinners, raffles, sponsorship and
                donations — all organised and voted on by the members of our Freemasons Lodge in
                Guildford.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg">
                At Weybridge Lodge, charitable commitment is entirely a matter for the individual
                and their personal circumstances. Donating is never expected to be to the detriment
                of the member or his family. What matters is the collective spirit — and on that
                measure, our Lodge consistently punches well above its weight.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Live Feed Component ── */}
        <OurCharitiesLiveFeed />

        {/* ── Thames Challenge Feature ── */}
        <section
          className="py-16 bg-background border-y border-border"
          aria-labelledby="thames-feature-heading"
        >
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="grid gap-8 rounded-sm border border-border bg-card p-8 md:grid-cols-[1.1fr_0.9fr] md:items-center md:p-10">
              <div>
                <p className="text-gold text-sm font-sans uppercase tracking-wide mb-3">
                  Featured charity story
                </p>
                <h2
                  id="thames-feature-heading"
                  className="text-3xl font-serif text-foreground mb-4"
                >
                  Walking for the Source — Thames Towpath Challenge
                </h2>
                <p className="text-muted-foreground font-sans leading-relaxed mb-6">
                  Follow Weybridge Lodge's Thames challenge from London back towards the source — a
                  long-distance story of endurance, support, friendship and charitable purpose from
                  members of our Masonic Lodge in Surrey.
                </p>
                {/* bg-gold text-navy replaces unapproved bg-gold-shimmer text-accent-foreground */}
                <Link
                  to="/thames-challenge"
                  aria-label="Read the Thames Towpath Challenge charity story from Weybridge Lodge"
                  className="inline-flex items-center gap-2 bg-gold text-navy px-6 py-3 rounded-sm text-sm font-semibold font-sans hover:opacity-90 transition-opacity min-h-[48px]"
                >
                  Read the feature
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>

              {/* bg-card replaces unapproved bg-muted on image placeholder */}
              {thamesChallengeImg && (
                <img
                  src={thamesChallengeImg}
                  alt="Walker at the Thames source stone during the Weybridge Lodge charity challenge"
                  className="hidden md:block w-full rounded-sm border border-border bg-card object-cover aspect-[4/3]"
                  loading="lazy"
                  width={480}
                  height={360}
                />
              )}
            </div>
          </div>
        </section>

        {/* ── Charity Cards ── */}
        {/* bg-navy flat: bg-navy-gradient is not a project token */}
        <section
          className="py-20 md:py-28 bg-navy"
          aria-labelledby="charity-cards-heading"
        >
          <div className="container mx-auto px-6 max-w-4xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={0}
              className="text-center mb-12"
            >
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2
                id="charity-cards-heading"
                className="text-3xl md:text-4xl font-serif text-gold"
              >
                The charities we support in Guildford and Surrey
              </h2>
            </motion.div>

            {/* ul/li: charity cards are a thematic list, not independent articles */}
            <ul className="space-y-12 list-none p-0 m-0">
              {charities.map((charity, i) => (
                <motion.li
                  key={charity.name}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView={shouldReduceMotion ? "static" : "visible"}
                  viewport={{ once: true }}
                  custom={i * 0.15}
                  // bg-card replaces unapproved bg-navy-light/30
                  // border-gold/30 replaces unapproved border-gold/15
                  className="bg-card border border-gold/30 rounded-sm p-8 md:p-10"
                >
                  <div className="flex items-start gap-5 mb-4">
                    {/* width/height explicit: prevents CLS on logo load */}
                    <img
                      src={charity.logo}
                      alt={`${charity.name} logo`}
                      className="w-14 h-14 object-contain flex-shrink-0 rounded-sm bg-card p-1 border border-border"
                      loading="lazy"
                      width={56}
                      height={56}
                    />
                    <div>
                      <p className="text-gold text-sm font-sans uppercase tracking-wide mb-2">
                        {charity.highlight}
                      </p>
                      {/* h3: charity names subordinate to section h2 */}
                      {/* text-foreground replaces unapproved text-primary-foreground */}
                      <h3 className="text-2xl font-serif text-foreground">
                        {charity.name}
                      </h3>
                    </div>
                  </div>

                  {/* text-gold/70 replaces unapproved text-primary-foreground/70 */}
                  <p className="text-gold/70 font-sans leading-relaxed mb-6">
                    {charity.description}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4">
                    {charity.postUrl && (
                      <Link
                        to={charity.postUrl}
                        aria-label={`Read the full story about Weybridge Lodge's support for ${charity.name}`}
                        className="inline-flex items-center gap-2 text-gold hover:text-gold/80 transition-colors text-sm font-sans min-h-[48px]"
                      >
                        Read the Full Story
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </Link>
                    )}
                    
                      href={charity.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Visit the ${charity.name} website (opens in new tab)`}
                      // hover:text-gold/80 replaces unapproved hover:text-gold-light
                      className="inline-flex items-center gap-2 text-gold hover:text-gold/80 transition-colors text-sm font-sans min-h-[48px]"
                    >
                      Visit Website
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </a>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Final CTA ── */}
        {/* Extracted from inside the charities section into its own semantic section.
            Previous version: bare link with no heading or copy — a hard dead end.
            Now: proper section with heading, copy, and two next-step options. */}
        <section
          className="py-16 bg-background border-t border-border"
          aria-labelledby="charities-cta-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={0}
            >
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2
                id="charities-cta-heading"
                className="font-serif text-foreground text-2xl md:text-3xl mb-3"
              >
                Charity you can be part of at Weybridge Lodge
              </h2>
              <p className="text-muted-foreground font-sans mb-8">
                Every member of our Freemasons Lodge in Guildford contributes to these causes. If
                this is the kind of community you want to be part of, we would be glad to hear from
                you.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  to="/join-us"
                  aria-label="Begin your application to join Weybridge Lodge No. 6787 in Guildford"
                  className="inline-flex items-center justify-center gap-2 bg-gold text-navy px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Begin Your Application
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/freemasonry-and-charity"
                  aria-label="Learn more about Freemasonry and charitable giving"
                  className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors min-h-[48px] w-full sm:w-auto"
                >
                  Freemasonry &amp; Charity
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

export default OurCharities;
