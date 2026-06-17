import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { articleSchema, breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, User, ArrowLeft } from "lucide-react";
import PostNavigation from "@/components/PostNavigation";
import SocialShare from "@/components/SocialShare";
import CommentsSection, { commentCount } from "@/components/CommentsSection";

import heroImg from "@/assets/news/75th-anniversary-group.png";
import fellowcraftImg from "@/assets/news/fellowcraft-apron.jpg";
import certificateImg from "@/assets/news/grand-lodge-certificate.jpg";
import chargingGlassImg from "@/assets/news/charging-glass.jpg";

const tocItems = [
  { id: "distinguished-guests", label: "Distinguished Guests" },
  { id: "what-went-on", label: "Well, What Went On?" },
  { id: "opening", label: "Opening The Masonic Meeting" },
  { id: "second-degree", label: "A Second Degree" },
  { id: "grand-lodge-certificates", label: "Grand Lodge Certificates" },
  { id: "festive-board", label: "A Festive Board With A Twist" },
];

const Anniversary75th = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="75th Anniversary Meeting"
        description="Weybridge Lodge No. 6787 celebrated its 75th anniversary at a special Masonic meeting in February 2024 at the South West Surrey Masonic Centre, Guildford."
        canonical="/news/75th-anniversary"
        type="article"
        schema={[
          articleSchema({ title: "Special Masonic Meeting For 75th Anniversary February 2024", date: "2024-02-28", description: "Weybridge Lodge celebrated its 75th anniversary.", url: "/news/75th-anniversary" }),
          breadcrumbSchema([{ name: "Home", url: "/" }, { name: "News", url: "/news" }, { name: "75th Anniversary", url: "/news/75th-anniversary" }]),
        ]}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Special Masonic Meeting For 75th Anniversary February 2024"
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
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> 28 February 2024</span>
              <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> W Bro. Julien Tidmarsh</span>
            </motion.div>

            {/* Hero image */}
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              src={heroImg}
              alt="The brethren of Weybridge Lodge No.6787 gathered in the temple after our 75th anniversary meeting February 2024"
              className="w-full rounded-sm mb-10"
            />

            <SocialShare url="/news/75th-anniversary" title="Special Masonic Meeting For 75th Anniversary February 2024" commentCount={commentCount} />

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
                The founders of Weybridge Lodge would be proud to see that what they started 75 years ago is still going strong. On Wednesday 21st February we celebrated our 75th anniversary at our 374th Regular Masonic Meeting.
              </p>

              {/* Distinguished Guests */}
              <section id="distinguished-guests">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Distinguished Guests</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  We were honoured to have two distinguished guests. Firstly our Distinguished Visitor the VW Bro. Michael Harding PGSwdB Deputy Provincial Grand Master accompanied by his Provincial Director of Ceremonies and Stewards. Also W Bro. Dan Williamson PAGSwdB Assistant Provincial Grand Master of St. Andrews Group of Lodges and W Bro. James Hill PPGSuptWks our nominated Official Visitor on behalf of the Provincial Grand Master.
                </p>
              </section>

              {/* What went on */}
              <section id="what-went-on">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Well, What Went On?</h2>
                <ul className="list-disc list-inside text-muted-foreground font-sans space-y-1">
                  <li>Opening The Masonic Meeting</li>
                  <li>A Second Degree</li>
                  <li>Grand Lodge Certificates</li>
                  <li>A Festive Board With A Twist</li>
                </ul>
              </section>

              {/* Opening */}
              <section id="opening">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Opening The Masonic Meeting</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  Following the pomp and ceremony of the Official Party procession into the Temple and the opening of the meeting, VW Bro. Michael Harding gave a well prepared insight of what went on in 1949 and the milestones in world history that have happened during the lifetime of Weybridge Lodge. This was very well received by the brethren.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  In addition, our Lodge Chaplain W Bro. Tony Mallard MBE, PPAGDC delivered a wonderful oration of the Lodge history in an extemporaneous manner.
                </p>
              </section>

              {/* Second Degree */}
              <section id="second-degree">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">A Second Degree</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  The fundamental part of any Masonic meeting is the Advancement of a member through the various degrees and tonight was no different.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  Bro. Calvin Gower's Passing to the Second Degree was exemplary. It was performed with great confidence by both the Candidate, the Senior Deacon and the Worshipful Master. We look forward to Calvin being raised to the Sublime Degree of a Master Mason in 2025.
                </p>
                <img
                  src={fellowcraftImg}
                  alt="A Fellowcraft Freemason's apron worn during the Second Degree ceremony in a Masonic Lodge"
                  className="w-full max-w-md mx-auto rounded-sm mt-6"
                  loading="lazy"
                />
              </section>

              {/* Grand Lodge Certificates */}
              <section id="grand-lodge-certificates">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Grand Lodge Certificates</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  Two of our Brethren who were made Master Masons in 2023 had the honour of being bestowed their Grand Lodge Certificates personally by VW Bro. Michael Harding.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  Bro. Julien Tidmarsh (Senior Deacon) and Bro. Robert Cooper (Inner Guard) listened intently as the DPGM delivered the Address on the Presentation of a Grand Lodge Certificate. This document is effectively a Freemason's passport to allow them entry to other Masonic Meetings at Freemasons Lodges worldwide.
                </p>
                <img
                  src={certificateImg}
                  alt="A United Grand Lodge of England Grand Lodge Certificate presented to a Master Mason of Weybridge Lodge"
                  className="w-full max-w-md mx-auto rounded-sm mt-6"
                  loading="lazy"
                />
              </section>

              {/* Festive Board */}
              <section id="festive-board">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">A Festive Board With A Twist</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  Following on from the Meeting, everybody continued to enjoy the evening at the Festive Board. A meal (in this case three course) which follows every Masonic meeting.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  Speeches are given and toasts are made to 'King, Craft and the Royal Arch' to name but a few. The difference this time was that everybody at the meeting received a commemorative 'Charging Glass' with which to make the toasts.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  The Brethren of Weybridge Lodge wanted everybody to have something to remember this auspicious evening with and the Charging Glass engraved with an anniversary Lodge logo was the perfect gift.
                </p>
                <img
                  src={chargingGlassImg}
                  alt="Commemorative Charging Glass engraved with the 75th anniversary Lodge logo"
                  className="w-full max-w-md mx-auto rounded-sm mt-6"
                  loading="lazy"
                />
                <p className="text-muted-foreground font-sans leading-relaxed mt-6">
                  A final touch was the rendition of the 'Working Tools of the Festive Board' by Bro. Julien Tidmarsh. This rarely heard piece of Masonic writing was very well received, in fact almost nobody had ever heard it before. It certainly rounded off the evening and gave everybody something to talk about.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  Well, that pretty much sums up the evening. A lot of planning went into making it a special night and special it was!
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4 italic">
                  Here's to the next 75 years of Weybridge Lodge although I'm not sure if blogs will still be around to report on it in 2099.
                </p>
              </section>
            </article>

            {/* Author */}
            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-sm font-serif text-foreground font-semibold">W Bro. Julien Tidmarsh</p>
              <p className="text-xs text-muted-foreground font-sans mt-1">
                Julien is the current Mentor and Tech Guy for Weybridge Lodge and has been a member since 2019.
              </p>
            </div>

            <CommentsSection />

            {/* Post Navigation */}
            <PostNavigation currentSlug="75th-anniversary" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Anniversary75th;
