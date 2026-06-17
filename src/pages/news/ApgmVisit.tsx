import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { articleSchema, breadcrumbSchema } from "@/components/SEO";
import PostNavigation from "@/components/PostNavigation";
import SocialShare from "@/components/SocialShare";
import CommentsSection, { commentCount } from "@/components/CommentsSection";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, User, ArrowLeft } from "lucide-react";

import heroImg from "@/assets/news/apgm-visit-full.jpg";
import officersImg from "@/assets/news/apgm-visit-group.jpg";
import groupImg from "@/assets/news/apgm-visit-officers.jpg";
import brigitteLogo from "@/assets/news/brigitte-trust-logo.png";

const tocItems = [
  { id: "pgm-visit", label: "The PGM's Official Visit" },
  { id: "initiation", label: "A First Degree Initiation Ceremony" },
  { id: "charity", label: "Charity & Giving Back" },
  { id: "festive-board", label: "The Festive Board" },
];

const ApgmVisit = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="PGM Visit February 2026"
        description="The Provincial Grand Master visited Weybridge Lodge No. 6787 for a First Degree Initiation ceremony at the South West Surrey Masonic Centre, Guildford."
        canonical="/news/pgm-visit-february-2026"
        type="article"
        schema={[
          articleSchema({
            title: "PGM Official Visit to Weybridge Lodge February 2026",
            date: "2026-02-19",
            description:
              "The Provincial Grand Master of Surrey visited Weybridge Lodge No. 6787 for an official visit and First Degree Initiation ceremony.",
            url: "/news/pgm-visit-february-2026",
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "News", url: "/news" },
            { name: "PGM Visit February 2026", url: "/news/pgm-visit-february-2026" },
          ]),
        ]}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="PGM Official Visit to Weybridge Lodge"
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
              <Link to="/news" className="inline-flex items-center gap-1 text-primary underline decoration-primary/40 hover:decoration-primary font-sans">
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
              alt="The brethren of Weybridge Lodge No. 6787 and visiting brethren gathered in the temple with the Provincial Grand Master, beneath the Truth Honour and Virtue inscription"
              className="w-full rounded-sm mb-10"
            />

            <SocialShare url="/news/pgm-visit-february-2026" title="PGM Official Visit to Weybridge Lodge February 2026" commentCount={commentCount} />

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
                    <a href={`#${item.id}`} className="text-sm font-sans text-primary underline decoration-primary/40 hover:decoration-primary">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </motion.nav>

            {/* Article body */}
            <article className="prose-custom space-y-10">
              <p className="text-muted-foreground font-sans leading-relaxed">
                Weybridge Lodge No. 6787 was honoured to welcome the Provincial Grand Master (PGM) of the Province of Surrey, RW Bro Nicholas Burger for an official visit on Wednesday 18th February 2026. Held at the South West Surrey Masonic Centre in Guildford, the evening was a truly memorable occasion that combined an excellent First Degree Initiation ceremony, charitable endeavour and warm fraternal fellowship.
              </p>

              {/* The PGM's Official Visit */}
              <section id="pgm-visit">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">The PGM's Official Visit</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  An official visit from the Provincial Grand Master is the highest honour a Lodge can receive and one of the most prestigious occasions in the Masonic calendar. The PGM was accompanied by a full delegation of Provincial officers, and the Lodge also welcomed visiting brethren from across the Province, making for an outstanding turnout in the temple.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  The brethren of Weybridge Lodge were delighted to receive such a distinguished guest and the evening was a fitting tribute to the hard work and dedication of the Lodge's members.
                </p>
                <img
                  src={officersImg}
                  alt="The Provincial Grand Master with the Worshipful Master and officers of Weybridge Lodge"
                  className="w-full max-w-md mx-auto rounded-sm mt-6"
                  loading="lazy"
                />
                <p className="text-xs text-muted-foreground text-center mt-2 italic">
                  The Provincial Grand Master with the Worshipful Master and brethren of Weybridge Lodge
                </p>
              </section>

              {/* Initiation Ceremony */}
              <section id="initiation">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">A First Degree Initiation Ceremony</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  The centrepiece of the evening was a First Degree Initiation ceremony, in which a new candidate was welcomed into the Craft as an Entered Apprentice. Performed in the presence of the Provincial Grand Master, the ceremony was conducted with great precision and sincerity, reflecting the high standards of ritual work that Weybridge Lodge is known for.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  The Initiation ceremony is the beginning of a Freemason's journey. It marks the moment a candidate takes his first steps into the Craft, receiving the secrets and symbols of the First Degree and pledging himself to the principles of Brotherly Love, Relief and Truth.
                </p>
                <img
                  src={groupImg}
                  alt="The PGM, Worshipful Master and two initiates after the ceremony"
                  className="w-full rounded-sm mt-6"
                  loading="lazy"
                />
                <p className="text-xs text-muted-foreground text-center mt-2 italic">
                  The PGM, Worshipful Master and two initiates after the ceremony
                </p>
              </section>

              {/* Charity */}
              <section id="charity">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Charity & Giving Back</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  Charity lies at the very heart of Freemasonry, and the evening was no exception. £565 was raised from the raffle and charity column which will be donated to the{" "}
                  <a href="https://www.brigittetrust.org/our-services/bereavement-support/" target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/40 hover:decoration-primary">
                    Brigitte Trust
                  </a>, a Surrey based charity that supports people struggling with bereavement through group counselling sessions.
                </p>
                <a href="https://www.brigittetrust.org/our-services/bereavement-support/" target="_blank" rel="noopener noreferrer" className="block my-6">
                  <img
                    src={brigitteLogo}
                    alt="The Brigitte Trust charity logo — a Surrey-based bereavement support organisation"
                    className="w-36 mx-auto hover:opacity-80 transition-opacity"
                    loading="lazy"
                  />
                </a>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  Weybridge Lodge has a proud record of charitable fundraising, most recently{" "}
                  <Link to="/news/sands-charity" className="text-primary underline decoration-primary/40 hover:decoration-primary">
                    raising over £31,000 for the SANDS charity
                  </Link>{" "}
                  through its Ladies Festival. The Lodge continues to support both Masonic and non-Masonic charities throughout the year, embodying the principle of Relief that is central to the Craft.
                </p>
              </section>

              {/* Festive Board */}
              <section id="festive-board">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">The Festive Board</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  Following the ceremony, the brethren retired to the festive board where an excellent meal was enjoyed by all. The PGM praised the Lodge for the quality of its ritual work and the warmth of its hospitality, noting that Weybridge Lodge continues to thrive as a welcoming and active Lodge within the Province of Surrey.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  A highlight of the festive board was the traditional Entered Apprentice Song, performed in honour of the newly initiated Brother. This centuries-old Masonic tradition is always a rousing and emotional moment, welcoming the newest member into the fraternity with song and applause.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  The evening concluded with the Initiate's Chain — a wonderful custom in which every Brother present shakes the hand of the new Initiate, forming a chain of friendship and fellowship that symbolises the bond shared by all Freemasons. It is a powerful reminder that from the moment of Initiation, a new Brother is never alone.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  If you are interested in finding out more about Freemasonry or joining Weybridge Lodge, please visit our{" "}
                  <Link to="/join-us" className="text-primary underline decoration-primary/40 hover:decoration-primary">
                    Join Us
                  </Link>{" "}
                  page or{" "}
                  <Link to="/contact" className="text-primary underline decoration-primary/40 hover:decoration-primary">
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

            <CommentsSection />

            {/* Post Navigation */}
            <PostNavigation currentSlug="pgm-visit-february-2026" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ApgmVisit;
