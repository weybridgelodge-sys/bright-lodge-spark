import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// ─── Interface ────────────────────────────────────────────────────────────────
interface Officer {
  office: string;
  name: string;
  honours: string;
  progressive: boolean;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const officers: Officer[] = [
  { office: "Worshipful Master", name: "W. Bro. J.P. Tidmarsh", honours: "", progressive: false },
  { office: "Immediate Past Master", name: "W. Bro. M. Grubb Jnr", honours: "", progressive: false },
  { office: "Senior Warden", name: "W. Bro. B.C. Connolly", honours: "ProvAGDC", progressive: true },
  { office: "Junior Warden", name: "W. Bro. K.N. Holdsworth", honours: "", progressive: true },
  { office: "Chaplain", name: "W. Bro. A.J.S. Mallard", honours: "M.B.E. / PPAGDC", progressive: false },
  { office: "Treasurer", name: "W. Bro. J.G. Scott", honours: "PPAGDC", progressive: false },
  { office: "Secretary", name: "W. Bro. R.D. Smith", honours: "PPAGSwdB", progressive: false },
  { office: "Director of Ceremonies", name: "W. Bro. K.P. Brennan", honours: "PPGSuptWks", progressive: false },
  { office: "Almoner", name: "Bro. S. Stamper", honours: "", progressive: false },
  { office: "Charity Steward", name: "W. Bro. K.N. Holdsworth", honours: "", progressive: false },
  { office: "Lodge Membership Officer", name: "W. Bro. B.C. Connolly", honours: "ProvAGDC", progressive: false },
  { office: "Lodge Mentor", name: "W. Bro. J. Tidmarsh", honours: "", progressive: false },
  { office: "Senior Deacon", name: "Bro. R.J. Cooper", honours: "", progressive: true },
  { office: "Junior Deacon", name: "Bro. W. Burrell", honours: "", progressive: true },
  { office: "Asst. Director of Ceremonies", name: "W. Bro. J.T. Coleman", honours: "PAGSwdB / PProvGAlm", progressive: false },
  { office: "Inner Guard", name: "Bro. C. Gower", honours: "", progressive: true },
  { office: "Asst. Secretary", name: "Bro. R.J. Cooper", honours: "", progressive: false },
  { office: "Tyler", name: "W. Bro. D.J. Poole", honours: "PPSGD", progressive: false },
  { office: "Steward", name: "Bro. W. Smyth", honours: "", progressive: true },
  { office: "Steward", name: "Bro. P. Vrtak", honours: "", progressive: true },
  { office: "Steward", name: "Bro. D. Blackburn", honours: "", progressive: true },
];

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  static: { opacity: 1, y: 0 },
};

// ─── Component ────────────────────────────────────────────────────────────────
const Officers = () => {
  const shouldReduceMotion = useReducedMotion();

  const pageSchema = useMemo(() => {
    // Fragment URL (/#about) removed from breadcrumb.
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Officers", url: "/officers" },
    ]);

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://www.weybridgelodge.org.uk/officers#webpage",
        url: "https://www.weybridgelodge.org.uk/officers",
        name: "Officers of the Lodge | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "Meet the officers of Weybridge Lodge No. 6787, Guildford, Surrey, for the Masonic Year 2025–2026 — from Worshipful Master to Stewards, with Provincial and Grand honours shown.",
        inLanguage: "en-GB",
        isPartOf: {
          "@id": "https://www.weybridgelodge.org.uk/#website",
        },
      },
      breadcrumb,
    ];
  }, []);

  // ── Table rows ──────────────────────────────────────────────────────────────
  // Extracted from IIFE inside JSX — improves readability and React DevTools
  // component tree clarity. IIFE in JSX is an anti-pattern in React 17+.
  const firstProgressiveIdx = officers.findIndex((o) => o.progressive);

  const renderedRows = officers.map((o, i) => {
    const showDivider = i === firstProgressiveIdx;
    // Composite key: stable identity if officer order changes.
    // key={i} was fragile — index shifts on any array reorder.
    const rowKey = `${o.office}-${o.name}`;

    return (
      // React.Fragment shorthand — React import no longer needed in React 17+
      <> 
        {showDivider && (
          <tr key={`divider-${rowKey}`} className="border-t-2 border-gold/40">
            <td
              colSpan={3}
              className="text-gold text-[10px] font-sans uppercase tracking-[0.2em] py-3"
            >
              Progressive Offices ★
            </td>
          </tr>
        )}
        <tr
          key={rowKey}
          // border-gold/10 replaces unapproved border-primary-foreground/10
          // hover:bg-gold/5 replaces unapproved hover:bg-primary-foreground/5
          className="border-b border-gold/10 hover:bg-gold/5 transition-colors"
        >
          {/* text-gold replaces unapproved text-primary-foreground */}
          <td className="text-gold font-sans text-sm py-3 pr-6">
            {o.office}{" "}
            {o.progressive && (
              <span className="text-gold" aria-label="progressive office">
                ★
              </span>
            )}
          </td>
          {/* text-gold/80 replaces unapproved text-primary-foreground/80 */}
          <td className="text-gold/80 font-sans text-sm py-3 pr-6">{o.name}</td>
          {/* text-gold/60 replaces unapproved text-primary-foreground/60 */}
          <td className="text-gold/60 font-sans text-xs py-3">{o.honours}</td>
        </tr>
      </>
    );
  });

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Officers of the Lodge | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787"
        description="Meet the officers of Weybridge Lodge No. 6787, Guildford, Surrey, for the Masonic Year 2025–2026 — from Worshipful Master to Stewards, with Provincial and Grand honours shown."
        canonical="/officers"
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
          title="Officers of Weybridge Lodge — Masonic Year 2025–2026"
          subtitle="The serving officers of our Freemasons Lodge in Guildford, Surrey"
        />

        {/* ── Intro Section ── */}
        <section
          className="py-20 md:py-28 bg-background"
          aria-labelledby="officers-intro-heading"
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
                id="officers-intro-heading"
                className="text-2xl md:text-3xl font-serif text-foreground"
              >
                How a Masonic Lodge in Surrey is run
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed">
                Weybridge Lodge is served by a full complement of officers for the Masonic Year
                2025–2026, appointed at the Installation Meeting in October 2025. Like all Masonic
                Lodges in Surrey and across England, our officers fill the roles necessary to
                conduct ceremonies, administer the Lodge, and look after the welfare of our members
                at the Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford,{" "}
                <span className="font-medium text-foreground">GU2 4DR</span>.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed">
                Progressive offices (marked ★) are taken in sequence by newer members of the Lodge,
                beginning as Steward and progressing through Inner Guard, the Deacons, and the
                Wardens toward the Chair of the Master. Non-progressive offices — such as Secretary,
                Treasurer, Director of Ceremonies, and Almoner — are typically held by experienced
                Past Masters, often for several years, to provide continuity and institutional
                knowledge.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed">
                A brother may hold more than one office in a given year, reflecting the Lodge's size
                and the breadth of experience among its members.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Officers Table ── */}
        {/* bg-navy flat: bg-navy-gradient is not a project token */}
        <section
          className="py-20 md:py-28 bg-navy"
          aria-labelledby="officers-table-heading"
        >
          <div className="container mx-auto px-6 max-w-4xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
            >
              <p className="text-gold text-sm font-sans uppercase tracking-wide mb-2">
                Masonic Year 2025–2026
              </p>
              <h2
                id="officers-table-heading"
                className="text-2xl md:text-3xl font-serif text-gold mb-8"
              >
                Officers of the Lodge
              </h2>

              {/* Dedicated scroll wrapper — isolates table overflow from motion block */}
              <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                {/* bg-card replaces unapproved bg-primary-foreground/5 backdrop-blur-sm
                    border-gold/30 replaces unapproved border-gold/20 */}
                <div className="bg-card border border-gold/30 rounded-sm p-4 sm:p-6 md:p-8 min-w-[480px] md:min-w-0">
                  <table className="w-full text-left">
                    {/* <caption>: essential for screen reader table navigation */}
                    <caption className="sr-only">
                      Officers of Weybridge Lodge No. 6787, Guildford, Surrey — Masonic Year
                      2025–2026. Progressive offices are marked with a star.
                    </caption>
                    <thead>
                      <tr className="border-b border-gold/30">
                        <th
                          scope="col"
                          className="text-gold text-xs font-sans uppercase tracking-widest py-4 pr-6"
                        >
                          Lodge Office
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
                    <tbody>{renderedRows}</tbody>
                  </table>
                </div>
              </div>

              {/* text-gold/70 replaces unapproved text-primary-foreground/85 */}
              <p className="text-gold/70 font-sans leading-relaxed mt-12 max-w-2xl mx-auto text-center">
                The officers listed here give their time freely in service to the Lodge and to
                Freemasonry. If you would like to know more about what each role involves — including
                the journey from Steward to Worshipful Master — visit our{" "}
                <Link
                  to="/officers-jewels"
                  className="text-gold underline underline-offset-4 hover:text-gold/80 transition-colors"
                >
                  Officers Roles & Jewels
                </Link>{" "}
                page.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        {/* Previous version: single bare button — dead end for a prospect.
            Now: proper section with heading, copy, and two next-step options. */}
        <section
          className="py-16 bg-background border-t border-border"
          aria-labelledby="officers-cta-heading"
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
                id="officers-cta-heading"
                className="font-serif text-foreground text-2xl md:text-3xl mb-3"
              >
                One day, your name could be on this list
              </h2>
              <p className="text-muted-foreground font-sans mb-8">
                Every officer here started as a new member. If you are curious about what the path
                from Initiate to Worshipful Master looks like at our Freemasons Lodge in Guildford,
                the next steps are below.
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
                  to="/worshipful-masters"
                  aria-label="View the Roll of Honour of every Worshipful Master of Weybridge Lodge"
                  className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors min-h-[48px] w-full sm:w-auto"
                >
                  View Worshipful Masters
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

export default Officers;
