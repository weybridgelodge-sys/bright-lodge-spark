import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface OfficerRow {
  office: string;
  name: string;
  honours: string;
  progressive: boolean;
  isVacantSteward?: boolean;
}

type OfficerRpcRow = {
  position_key: string;
  title: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  post_nominals: string | null;
  provincial_rank: string | null;
  grand_rank: string | null;
  is_past_master: boolean | null;
};

// ─── Display order & metadata ────────────────────────────────────────────────
// Preserves the layout of the previous static list: WM/IPM at the top, then
// the "Progressive Offices ★" divider before Senior Warden, then everything
// else. Steward positions are always at the end.
const DISPLAY: {
  key: string;
  office: string;
  progressive: boolean;
  isSteward?: boolean;
}[] = [
  { key: "worshipful_master",                office: "Worshipful Master",                progressive: false },
  { key: "immediate_past_master",            office: "Immediate Past Master",            progressive: false },
  { key: "senior_warden",                    office: "Senior Warden",                    progressive: true  },
  { key: "junior_warden",                    office: "Junior Warden",                    progressive: true  },
  { key: "chaplain",                         office: "Chaplain",                         progressive: false },
  { key: "treasurer",                        office: "Treasurer",                        progressive: false },
  { key: "secretary",                        office: "Secretary",                        progressive: false },
  { key: "director_of_ceremonies",           office: "Director of Ceremonies",           progressive: false },
  { key: "almoner",                          office: "Almoner",                          progressive: false },
  { key: "charity_steward",                  office: "Charity Steward",                  progressive: false },
  { key: "membership_officer",               office: "Lodge Membership Officer",         progressive: false },
  { key: "mentor",                           office: "Lodge Mentor",                     progressive: false },
  { key: "senior_deacon",                    office: "Senior Deacon",                    progressive: true  },
  { key: "junior_deacon",                    office: "Junior Deacon",                    progressive: true  },
  { key: "assistant_director_of_ceremonies", office: "Asst. Director of Ceremonies",     progressive: false },
  { key: "inner_guard",                      office: "Inner Guard",                      progressive: true  },
  { key: "assistant_secretary",              office: "Asst. Secretary",                  progressive: false },
  { key: "tyler",                            office: "Tyler",                            progressive: false },
  { key: "assistant_tyler",                  office: "Asst. Tyler",                      progressive: false },
  { key: "senior_steward",                   office: "Senior Steward",                   progressive: true, isSteward: true },
  { key: "steward_1",                        office: "Steward",                          progressive: true, isSteward: true },
  { key: "steward_2",                        office: "Steward",                          progressive: true, isSteward: true },
  { key: "steward_3",                        office: "Steward",                          progressive: true, isSteward: true },
  { key: "steward_4",                        office: "Steward",                          progressive: true, isSteward: true },
  { key: "steward_5",                        office: "Steward",                          progressive: true, isSteward: true },
];

// ─── Formatters ──────────────────────────────────────────────────────────────
function formatTitle(title: string | null): string {
  if (!title) return "Bro.";
  const t = title.trim();
  // Ensure trailing period on the title (DB stores "Bro" / "W Bro" / …).
  return t.endsWith(".") ? t : `${t}.`;
}

function formatInitials(first: string | null, middle: string | null): string {
  const parts = [first, middle]
    .filter(Boolean)
    .flatMap((s) => (s as string).trim().split(/\s+/))
    .filter(Boolean);
  if (parts.length === 0) return "";
  return parts.map((p) => `${p[0].toUpperCase()}.`).join("");
}

function formatName(row: OfficerRpcRow): string {
  const title = formatTitle(row.title);
  const initials = formatInitials(row.first_name, row.middle_name);
  const surname = (row.last_name ?? "").trim();
  return [title, initials, surname].filter(Boolean).join(" ");
}

function formatHonours(row: OfficerRpcRow): string {
  return [row.post_nominals, row.provincial_rank, row.grand_rank]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" / ");
}

// ─── Animation variants ──────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  static: { opacity: 1, y: 0 },
};

// ─── Component ───────────────────────────────────────────────────────────────
const Officers = () => {
  const shouldReduceMotion = useReducedMotion();
  const [rpcRows, setRpcRows] = useState<OfficerRpcRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_officers_public", { _year: null });
      if (cancelled) return;
      if (error) {
        console.error("get_officers_public failed:", error);
        setRpcRows([]);
        return;
      }
      setRpcRows((data ?? []) as OfficerRpcRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const officers: OfficerRow[] = useMemo(() => {
    const byKey = new Map<string, OfficerRpcRow>();
    for (const r of rpcRows ?? []) byKey.set(r.position_key, r);

    const rows: OfficerRow[] = [];
    for (const d of DISPLAY) {
      const filled = byKey.get(d.key);
      if (filled) {
        rows.push({
          office: d.office,
          name: formatName(filled),
          honours: formatHonours(filled),
          progressive: d.progressive,
        });
      } else if (!d.isSteward) {
        // Non-Steward vacancies: show the role with "Vacant".
        rows.push({
          office: d.office,
          name: "Vacant",
          honours: "",
          progressive: d.progressive,
        });
      }
      // Stewards: omit the row entirely when no appointment exists.
    }
    return rows;
  }, [rpcRows]);

  const pageSchema = useMemo(() => {
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Officers", url: "/officers" },
    ]);

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://weybridgelodge.org.uk/officers#webpage",
        url: "https://weybridgelodge.org.uk/officers",
        name: "Officers of the Lodge | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "Meet the officers of Weybridge Lodge No. 6787, Guildford, Surrey, for the Masonic Year 2025–2026 — from Worshipful Master to Stewards, with Provincial and Grand honours shown.",
        inLanguage: "en-GB",
        isPartOf: {
          "@id": "https://weybridgelodge.org.uk/#website",
        },
      },
      breadcrumb,
    ];
  }, []);

  const firstProgressiveIdx = officers.findIndex((o) => o.progressive);

  const renderedRows = officers.map((o, i) => {
    const showDivider = i === firstProgressiveIdx;
    const rowKey = `${o.office}-${o.name}-${i}`;

    return (
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
          className="border-b border-gold/10 hover:bg-gold/5 transition-colors"
        >
          <td className="text-gold font-sans text-sm py-3 pr-6">
            {o.office}{" "}
            {o.progressive && (
              <span className="text-gold" aria-label="progressive office">
                ★
              </span>
            )}
          </td>
          <td className="text-gold/80 font-sans text-sm py-3 pr-6">{o.name}</td>
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

        <PageHeader
          title="Officers of Weybridge Lodge — Masonic Year 2025–2026"
          subtitle="The serving officers of our Freemasons Lodge in Guildford, Surrey"
        />

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

              <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                <div className="bg-card border border-gold/30 rounded-sm p-4 sm:p-6 md:p-8 min-w-[480px] md:min-w-0">
                  <table className="w-full text-left">
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
                    <tbody>
                      {rpcRows === null ? (
                        <tr>
                          <td colSpan={3} className="text-gold/60 font-sans text-sm py-6 text-center">
                            Loading officers…
                          </td>
                        </tr>
                      ) : (
                        renderedRows
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

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
                  className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
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
