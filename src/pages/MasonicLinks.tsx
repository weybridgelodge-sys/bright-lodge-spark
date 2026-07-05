import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import ugleLogo from "@/assets/links/ugle-logo.png";
import surreyLogo from "@/assets/links/surrey-logo.png";
import metglLogo from "@/assets/links/metgl-logo.png";
import mcfLogo from "@/assets/links/mcf-logo.png";
import hfafLogo from "@/assets/links/hfaf-logo.png";
import royalarchLogo from "@/assets/links/royalarch-logo.svg";
import museumLogo from "@/assets/links/museum-freemasonry-logo.png";
import astolatLogo from "@/assets/links/astolat-logo.png";

// ─── Interface ────────────────────────────────────────────────────────────────
interface MasonicLink {
  name: string;
  url: string;
  description: string;
  logo: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const links: MasonicLink[] = [
  {
    name: "United Grand Lodge of England (UGLE)",
    url: "https://www.ugle.org.uk/",
    description:
      "The governing body of Freemasonry in England, Wales and certain other territories — the umbrella organisation under which Weybridge Lodge No. 6787 operates.",
    logo: ugleLogo,
  },
  {
    name: "Provincial Grand Lodge of Surrey",
    url: "https://surreyfreemasons.org.uk/",
    description:
      "The Provincial Grand Lodge overseeing Freemasonry across Surrey, of which Weybridge Lodge No. 6787 is a constituent Lodge.",
    logo: surreyLogo,
  },
  {
    name: "Metropolitan Grand Lodge of London",
    url: "https://www.metgl.com/",
    description:
      "The Metropolitan Grand Lodge serving Freemasons in London — a key neighbouring Province for members of our Masonic Lodge in Surrey.",
    logo: metglLogo,
  },
  {
    name: "Masonic Charitable Foundation (MCF)",
    url: "https://mcf.org.uk/",
    description:
      "The principal charity funded by Freemasons, supporting members, families and the wider community through grants, relief and welfare across England and Wales.",
    logo: mcfLogo,
  },
  {
    name: "Freemasonry for Women (HFAF)",
    url: "https://hfaf.org/",
    description:
      "One of the two main Grand Lodges in the UK exclusively for women, following similar ceremonies and traditions to the UGLE and actively participating in charity work.",
    logo: hfafLogo,
  },
  {
    name: "Holy Royal Arch",
    url: "https://www.ugle.org.uk/about-us/royal-arch/supreme-grand-chapter",
    description:
      "The Supreme Grand Chapter of Royal Arch Masons of England — considered the natural completion of the Third Degree and the fourth step in a Master Mason's journey.",
    logo: royalarchLogo,
  },
  {
    name: "Museum of Freemasonry",
    url: "https://museumoffreemasonry.org.uk/",
    description:
      "Located at Freemasons' Hall in London, home to one of the finest collections of Masonic artefacts in the world — open to the public.",
    logo: museumLogo,
  },
  {
    name: "Astolat Lodge No. 5848",
    url: "https://astolat.org/",
    description:
      "A sister Lodge also meeting at the Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford, GU2 4DR — a warm neighbouring Lodge within the Province of Surrey.",
    logo: astolatLogo,
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
const MasonicLinks = () => {
  const shouldReduceMotion = useReducedMotion();

  const pageSchema = useMemo(() => {
    // Fragment URL (/#about) removed from breadcrumb — Google may not
    // resolve fragment anchors correctly in BreadcrumbList structured data.
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Masonic Links", url: "/masonic-links" },
    ]);

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://www.weybridgelodge.org.uk/masonic-links#webpage",
        url: "https://www.weybridgelodge.org.uk/masonic-links",
        name: "Masonic Links & Resources | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "Useful Masonic links and resources including UGLE, the Provincial Grand Lodge of Surrey, and the Masonic Charitable Foundation — curated by Weybridge Lodge No. 6787, Guildford, GU2 4DR.",
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
        title="Masonic Links & Resources | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787"
        description="Useful Masonic links and resources including UGLE, the Provincial Grand Lodge of Surrey, and the Masonic Charitable Foundation — curated by Weybridge Lodge No. 6787 in Guildford, Surrey."
        canonical="/masonic-links"
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
          title="Masonic Links & Resources for Freemasons in Guildford and Surrey"
          subtitle="Useful websites and organisations connected to Weybridge Lodge No. 6787 and the wider Craft"
        />

        {/* ── Links Section ── */}
        <section
          className="py-20 md:py-28 bg-background"
          aria-labelledby="links-section-heading"
        >
          <div className="container mx-auto px-6 max-w-3xl">

            {/* Section h2 — anchors the list for Google's section parser.
                Previously absent: page went H1 → eight competing H2 link names. */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={0}
              className="mb-10"
            >
              <div className="h-px w-16 bg-gold mb-6" aria-hidden="true" />
              <h2
                id="links-section-heading"
                className="font-serif text-foreground text-2xl md:text-3xl mb-4"
              >
                Organisations connected to our Masonic Lodge in Surrey
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed">
                The following organisations form the wider landscape of Freemasonry in England
                and Surrey — from the governing body to charitable foundations, sister Lodges,
                and specialist chapters. All external links open in a new tab.
              </p>
            </motion.div>

            {/* ul/li: links are a semantic list.
                Previously: motion.a cards with h2 nested inside — heading inside
                an interactive element is an accessibility anti-pattern that breaks
                screen reader heading navigation.
                Solution: li contains the card layout; the link uses a stretch-link
                ::after overlay to keep the full card clickable without nesting
                heading inside anchor. */}
            <ul className="space-y-4 list-none p-0 m-0">
              {links.map((link, i) => (
                <motion.li
                  key={link.name}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView={shouldReduceMotion ? "static" : "visible"}
                  viewport={{ once: true }}
                  custom={i * 0.05}
                  className="relative group rounded-sm border border-border bg-card hover:border-gold/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="flex items-start gap-4">
                      {/* width/height explicit: prevents CLS on logo load */}
                      <img
                        src={link.logo}
                        alt={`${link.name} logo`}
                        className="w-10 h-10 object-contain flex-shrink-0 rounded-sm mt-0.5"
                        loading="lazy"
                        width={40}
                        height={40}
                      />
                      <div>
                        {/* h3: link names subordinate to section h2 above */}
                        <h3 className="font-serif text-foreground group-hover:text-gold transition-colors mb-1">
                          {/* Stretch link: ::after overlay covers full card.
                              Heading is NOT inside the anchor — a11y compliant. */}
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Visit ${link.name} website (opens in new tab)`}
                            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm"
                          >
                            {link.name}
                          </a>
                        </h3>
                        <p className="text-muted-foreground font-sans text-sm leading-relaxed">
                          {link.description}
                        </p>
                      </div>
                    </div>
                    {/* aria-hidden: decorative indicator, announced by the link label above */}
                    <ExternalLink
                      className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors flex-shrink-0 mt-1"
                      aria-hidden="true"
                    />
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Final CTA ── */}
        {/* Previous version: bare single button with no heading or context.
            A prospect browsing Masonic links is at a research stage — they need
            a warm bridge to the next conversion step, not a cold button. */}
        <section
          className="py-16 bg-navy"
          aria-labelledby="links-cta-heading"
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
                id="links-cta-heading"
                className="font-serif text-gold text-2xl md:text-3xl mb-3"
              >
                Interested in joining a Masonic Lodge in Guildford?
              </h2>
              <p className="text-gold/70 font-sans mb-8">
                Weybridge Lodge No. 6787 meets at the Guildford Masonic Centre, Weybourne House,
                Hitherbury Close, Guildford,{" "}
                <span className="font-semibold text-gold">GU2 4DR</span>. If you would like to
                find out whether Freemasonry is right for you, we would be glad to hear from you.
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
                  to="/quiz"
                  aria-label="Take the 2-minute quiz to see if Freemasonry is right for you"
                  className="inline-flex items-center justify-center bg-transparent text-gold border border-gold/40 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
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

export default MasonicLinks;
