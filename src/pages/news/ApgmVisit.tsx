import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { articleSchema, breadcrumbSchema } from "@/components/SEO";
import PostNavigation from "@/components/PostNavigation";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, User, ArrowLeft } from "lucide-react";

import heroImg from "@/assets/news/apgm-visit-full.jpg";
import officersImg from "@/assets/news/apgm-visit-officers.jpg";
import groupImg from "@/assets/news/apgm-visit-group.jpg";

const tocItems = [
  { id: "apgm-visit", label: "The APGM's Official Visit" },
  { id: "ceremony", label: "A Second Degree Passing Ceremony" },
  { id: "fellowship", label: "Brotherhood & Fellowship" },
];

const ApgmVisit = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="APGM Official Visit to Weybridge Lodge February 2026 | Guildford"
        description="The Assistant Provincial Grand Master visited Weybridge Lodge No. 6787 for a Second Degree Passing ceremony at the South West Surrey Masonic Centre, Guildford."
        canonical="/news/apgm-visit-february-2026"
        type="article"
        schema={[
          articleSchema({
            title: "APGM Official Visit to Weybridge Lodge February 2026",
            date: "2026-02-19",
            description:
              "The Assistant Provincial Grand Master of Surrey visited Weybridge Lodge No. 6787 for an official visit and Second Degree Passing ceremony.",
            url: "/news/apgm-visit-february-2026",
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "News", url: "/news" },
            { name: "APGM Visit February 2026", url: "/news/apgm-visit-february-2026" },
          ]),
        ]}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="APGM Official Visit to Weybridge Lodge"
          subtitle="Lodge Meetings"
        />

        <section className="py-16 md:py-24 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            {/* Meta */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8"
            >
              <Link to="/news" className="inline-flex items-center gap-1 text-primary hover:underline font-sans">
                <ArrowLeft className="h-4 w-4" /> Back to News
              </Link>
              <span className="hidden sm:inline">|</span>
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> 19 February 2026</span>
              <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> Weybridge Lodge</span>
            </motion.div>

            {/* Hero image */}
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              src={heroImg}
              alt="The brethren of Weybridge Lodge No. 6787 and visiting brethren gathered in the temple with the Assistant Provincial Grand Master, beneath the Truth Honour and Virtue inscription"
              className="w-full rounded-sm mb-10"
            />

            {/* Table of Contents */}
            <motion.nav
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              aria-label="Table of contents"
              className="mb-12 p-6 border border-border rounded-sm bg-card"
            >
              <h2 className="text-lg font-serif text-foreground mb-3">Table of Contents</h2>
              <ol className="list-decimal list-inside space-y-1.5">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="text-sm font-sans text-primary hover:underline">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </motion.nav>

            {/* Article body */}
            <article className="prose-custom space-y-10">
              <p className="text-muted-foreground font-sans leading-relaxed">
                Weybridge Lodge No. 6787 was honoured to welcome the Assistant Provincial Grand Master (APGM) of the Province of Surrey for an official visit on Wednesday 18th February 2026. Held at the South West Surrey Masonic Centre in Guildford, the evening was a memorable occasion that combined excellent ceremony with warm fraternal fellowship.
              </p>

              {/* The APGM's Official Visit */}
              <section id="apgm-visit">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">The APGM's Official Visit</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  An official visit from the Assistant Provincial Grand Master is one of the highlights of any Lodge's calendar. It is a mark of recognition and support from the Provincial Grand Lodge of Surrey, and the brethren of Weybridge Lodge were delighted to receive such a distinguished guest.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  The APGM was accompanied by a delegation of Provincial officers, and the Lodge also welcomed visiting brethren from across the Province, making for a truly impressive turnout in the temple.
                </p>
                <img
                  src={officersImg}
                  alt="The Assistant Provincial Grand Master with the Worshipful Master and officers of Weybridge Lodge"
                  className="w-full max-w-md mx-auto rounded-sm mt-6"
                  loading="lazy"
                />
                <p className="text-xs text-muted-foreground text-center mt-2 italic">
                  The Assistant Provincial Grand Master with the Worshipful Master and brethren of Weybridge Lodge
                </p>
              </section>

              {/* Ceremony */}
              <section id="ceremony">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">A Second Degree Passing Ceremony</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  The centrepiece of the evening was a Second Degree Passing ceremony, in which a Brother was advanced to the degree of Fellowcraft. The ceremony was conducted with precision and sincerity, reflecting the high standards that Weybridge Lodge is known for.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  The Passing ceremony is a significant step in a Freemason's journey, marking the transition from the First Degree of Entered Apprentice to the Second Degree of Fellowcraft. It introduces the candidate to further Masonic knowledge and encourages him to deepen his understanding of the principles of the Craft.
                </p>
                <img
                  src={groupImg}
                  alt="Members and officers of Weybridge Lodge with the APGM after the Second Degree Passing ceremony"
                  className="w-full rounded-sm mt-6"
                  loading="lazy"
                />
                <p className="text-xs text-muted-foreground text-center mt-2 italic">
                  Members and officers of Weybridge Lodge gathered with the APGM after the ceremony
                </p>
              </section>

              {/* Fellowship */}
              <section id="fellowship">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Brotherhood & Fellowship</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  Following the ceremony, the brethren retired to the festive board where an excellent meal was enjoyed by all. The APGM praised the Lodge for the quality of its ritual work and the warmth of its hospitality, noting that Weybridge Lodge continues to thrive as a welcoming and active Lodge within the Province of Surrey.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  Evenings such as these are a wonderful reminder of what makes Freemasonry special — the coming together of like-minded men from all walks of life, united by shared values of integrity, friendship and charity.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  If you are interested in finding out more about Freemasonry or joining Weybridge Lodge, please visit our{" "}
                  <Link to="/join-us" className="text-primary hover:underline">
                    Join Us
                  </Link>{" "}
                  page or{" "}
                  <Link to="/contact" className="text-primary hover:underline">
                    get in touch
                  </Link>.
                </p>
              </section>
            </article>

            {/* Author */}
            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-sm font-serif text-foreground font-semibold">Weybridge Lodge No. 6787</p>
              <p className="text-xs text-muted-foreground font-sans mt-1">
                Weybridge Lodge meets at the South West Surrey Masonic Centre in Guildford and has been going strong since 1949.
              </p>
            </div>

            {/* Post Navigation */}
            <PostNavigation currentSlug="apgm-visit-february-2026" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ApgmVisit;
