import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { sanityClient } from "@/lib/sanity";
import { masters as fallbackMasters } from "@/data/worshipfulMasters";

interface Master {
  year: string | number;
  name: string;
  honours?: string;
}

interface SanityMaster {
  _id: string;
  name: string;
  masonicYear: string;
  honours?: string;
  order?: number;
}

const MASTERS_QUERY = `*[_type == "worshipfulMaster"] | order(order asc, masonicYear asc) {
  _id, name, masonicYear, honours, order
}`;

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  static: { opacity: 1, y: 0 },
};

// ─── Component ────────────────────────────────────────────────────────────────
const WorshipfulMasters = () => {
  const shouldReduceMotion = useReducedMotion();

  const { data: sanityMasters, isLoading } = useQuery({
    queryKey: ["worshipfulMasters"],
    queryFn: () => sanityClient.fetch<SanityMaster[]>(MASTERS_QUERY),
    staleTime: 5 * 60 * 1000,
  });

  const masters: Master[] = useMemo(() => {
    if (sanityMasters && sanityMasters.length > 0) {
      return sanityMasters.map((m) => ({
        year: m.masonicYear,
        name: m.name,
        honours: m.honours ?? "",
      }));
    }
    return fallbackMasters as Master[];
  }, [sanityMasters]);


  const pageSchema = useMemo(() => {
    // Fragment URL (/#about) removed from breadcrumb.
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Worshipful Masters", url: "/worshipful-masters" },
    ]);

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://www.weybridgelodge.org.uk/worshipful-masters#webpage",
        url: "https://www.weybridgelodge.org.uk/worshipful-masters",
        name: "Worshipful Masters — Roll of Honour | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "The complete Roll of Honour of every Worshipful Master of Weybridge Lodge No. 6787, Guildford, Surrey, from our founding in 1949 to the present day.",
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
        title="Worshipful Masters — Roll of Honour | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787"
        description="The complete Roll of Honour of every Worshipful Master of Weybridge Lodge No. 6787, Guildford, Surrey, from our founding in 1949 to the present day."
        canonical="/worshipful-masters"
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
          title="Worshipful Masters of Weybridge Lodge — Roll of Honour 1949 to Present"
          subtitle="Every brother who has served as Master of our Freemasons Lodge in Guildford, Surrey"
        />

        {/* ── Intro Section ── */}
        <section
          className="py-20 md:py-28 bg-background"
          aria-labelledby="roll-intro-heading"
        >
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="h-px w-16 bg-gold mb-2" aria-hidden="true" />
              <h2
                id="roll-intro-heading"
                className="text-2xl md:text-3xl font-serif text-foreground"
              >
                The highest honour in our Masonic Lodge in Guildford
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed">
                There is no greater honour in a Freemason's Lodge journey than being chosen as
                Worshipful Master. The position is earned over years of service — conducting
                ceremonies, supporting fellow members, and learning the Craft from the inside. In a
                Lodge of Weybridge's tradition, a brother would typically spend six or more years
                progressing through the offices before taking the Chair.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed">
                The Worshipful Master presides over every meeting, leads the Brethren through their
                Masonic degrees, and is — for that year — the face of the Lodge. Roy Edmonds, our
                founding Worshipful Master in 1949, set the standard: a stickler for Masonic
                etiquette and good ritual, but always approachable and generous with his guidance.
                His son Freddie, the Lodge's first Initiate, waited eight years before following him
                into the Chair in 1957. That continuity of purpose — of earning the honour — remains
                the hallmark of Weybridge Lodge today.
              </p>
              <p className="text-foreground font-sans leading-relaxed">
                The complete Roll of Honour of every Worshipful Master who has served Weybridge
                Lodge since our consecration in 1949 is recorded below.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Roll of Honour Table ── */}
        {/* bg-navy flat: bg-navy-gradient is not a project token */}
        <section
          className="py-20 md:py-28 bg-navy"
          aria-labelledby="roll-table-heading"
        >
          <div className="container mx-auto px-6 max-w-4xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
            >
              <p className="text-gold text-sm font-sans uppercase tracking-wide mb-2">
                Roll of Honour
              </p>
              <h2
                id="roll-table-heading"
                className="text-2xl md:text-3xl font-serif text-gold mb-8"
              >
                Worshipful Masters — 1949 to Present
              </h2>

              {/* Dedicated scroll container — wraps only the table,
                  not the entire motion block, for cleaner iOS overflow handling */}
              <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                {/* bg-card replaces unapproved bg-primary-foreground/5 backdrop-blur-sm
                    border-gold/30 replaces unapproved border-gold/20 */}
                <div className="bg-card border border-gold/30 rounded-sm p-4 sm:p-6 md:p-8 min-w-[480px] md:min-w-0">
                  <table className="w-full text-left">
                    {/* <caption>: essential accessibility element for data tables.
                        Screen readers announce this as the table's purpose. */}
                    <caption className="sr-only">
                      Complete Roll of Honour — every Worshipful Master of Weybridge Lodge No.
                      6787 in Guildford, Surrey, from 1949 to the present day
                    </caption>
                    <thead>
                      <tr className="border-b border-gold/30">
                        <th
                          scope="col"
                          className="text-gold text-xs font-sans uppercase tracking-widest py-4 pr-6"
                        >
                          Year
                        </th>
                        <th
                          scope="col"
                          className="text-gold text-xs font-sans uppercase tracking-widest py-4 pr-6"
                        >
                          Name
                        </th>
                        <th
                          scope="col"
                          className="text-gold text-xs font-sans uppercase tracking-widest py-4"
                        >
                          Honours
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(masters as Master[]).map((m) => (
                        // Composite key: stable identity even if year order changes.
                        // key={i} was fragile — index shifts on array reorder.
                        <tr
                          key={`${m.year}-${m.name}`}
                          // border-gold/10 replaces unapproved border-primary-foreground/10
                          // hover:bg-gold/5 replaces unapproved hover:bg-primary-foreground/5
                          className="border-b border-gold/10 hover:bg-gold/5 transition-colors"
                        >
                          {/* text-gold/80 replaces unapproved text-primary-foreground/80 */}
                          <td className="text-gold/80 font-sans text-sm py-3 pr-6">
                            {m.year}
                          </td>
                          {/* text-gold replaces unapproved text-primary-foreground */}
                          <td className="text-gold font-sans text-sm py-3 pr-6">
                            {m.name}
                          </td>
                          {/* text-gold/60 replaces unapproved text-primary-foreground/60 */}
                          <td className="text-gold/60 font-sans text-xs py-3">
                            {m.honours}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* text-gold/60 replaces unapproved text-primary-foreground/60 */}
              <p className="text-gold/60 font-sans text-xs italic leading-relaxed mt-6 max-w-3xl mx-auto text-center">
                Provincial and Grand honours are shown where held at time of service or subsequently
                attained. If you believe an entry requires correction or addition, please contact
                the Lodge Secretary.
              </p>

              {/* text-gold/70 replaces unapproved text-primary-foreground/85 */}
              <p className="text-gold/70 font-sans leading-relaxed mt-12 max-w-2xl mx-auto text-center">
                The role of Worshipful Master is one of the defining privileges of a Freemason's
                life. If you are curious about what that journey looks like — from first steps as an
                Entered Apprentice to the Chair of the Lodge — we would be delighted to{" "}
                <Link
                  to="/join-us"
                  className="text-gold underline underline-offset-4 hover:text-gold/80 transition-colors"
                >
                  tell you more
                </Link>
                .
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        {/* Previous version: bare centered button with no heading or copy — dead end.
            Now: proper section with context, two next-step options. */}
        <section
          className="py-16 bg-background border-t border-border"
          aria-labelledby="masters-cta-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
            >
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2
                id="masters-cta-heading"
                className="font-serif text-foreground text-2xl md:text-3xl mb-3"
              >
                Start your own journey at Weybridge Lodge
              </h2>
              <p className="text-muted-foreground font-sans mb-8">
                Every name on that Roll of Honour began exactly where you are now — curious,
                considering, and not yet a member. If you would like to understand what the path to
                the Chair looks like at our Freemasons Lodge in Guildford, the next steps are below.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  to="/join-us"
                  aria-label="Begin your application to join Weybridge Lodge No. 6787 in Guildford"
                  className="inline-flex items-center justify-center gap-2 bg-gold text-navy px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Begin Your Application
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/your-journey"
                  aria-label="Read about the Masonic journey from Entered Apprentice to Worshipful Master"
                  className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors min-h-[48px] w-full sm:w-auto"
                >
                  The Masonic Journey
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

export default WorshipfulMasters;
