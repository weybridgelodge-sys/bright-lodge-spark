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

import heroImg from "@/assets/news/double-initiation-december-2025.jpg";

const tocItems = [
  { id: "ceremony", label: "A Memorable Double Initiation" },
  { id: "brothers", label: "Welcoming Bro. Jesse and Bro. Josh Bishop" },
  { id: "festive-board", label: "Celebrating at the Festive Board" },
  { id: "future", label: "Looking Ahead" },
];

const URL = "/news/double-initiation-december-2025";
const TITLE = "Double Initiation at Weybridge Lodge — December 2025";

const DoubleInitiationDecember2025 = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Double Initiation at Weybridge Lodge — December 2025"
        description="Weybridge Lodge No. 6787 welcomed two new Brethren in a double First Degree Initiation ceremony in December 2025 at the South West Surrey Masonic Centre, Guildford."
        canonical={URL}
        type="article"
        
        schema={[
          articleSchema({
            title: TITLE,
            date: "2025-12-10",
            description:
              "Weybridge Lodge No. 6787 welcomed two new Brethren in a double First Degree Initiation ceremony in December 2025 at the South West Surrey Masonic Centre, Guildford.",
            url: URL,
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "News", url: "/news" },
            { name: "Double Initiation December 2025", url: URL },
          ]),
        ]}
      />

      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader title={TITLE} subtitle="Lodge Meetings" />

        <section className="py-16 md:py-24 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
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
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> 10 December 2025</span>
              <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> W Bro. Julien Tidmarsh</span>
            </motion.div>

            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              src={heroImg}
              alt="Weybridge Lodge No. 6787 brethren at the December 2025 double initiation ceremony, South West Surrey Masonic Centre, Guildford"
              className="w-full rounded-sm mb-10"
            />

            <SocialShare url={URL} title={TITLE} commentCount={commentCount} />

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

            <article className="prose-custom space-y-10">
              <p className="text-muted-foreground font-sans leading-relaxed">
                On the evening of Wednesday 10 December 2025, the brethren of Weybridge Lodge No. 6787 gathered at the South West Surrey Masonic Centre for one of the most uplifting meetings in our recent calendar — a double First Degree Initiation welcoming two new Brethren into our Lodge and into Freemasonry.
              </p>

              <section id="ceremony">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">A Memorable Double Initiation</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  Double initiations are rare and always special; the Lodge worked carefully through the ceremony so that each Candidate received the full attention, dignity and care that the First Degree deserves. The Worshipful Master and Officers delivered the ritual with warmth and precision, and the Temple was full of brethren — many travelling from neighbouring Lodges to share in the occasion.
                </p>
              </section>

              <section id="brothers">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Welcoming Bro. Jesse and Bro. Josh Bishop</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  We were delighted to initiate <strong>Bro. Jesse Bishop</strong> and <strong>Bro. Josh Bishop</strong> on the same evening — a moment of real significance for the Bishop family and a memory that the Lodge will treasure for many years to come. Both took their Obligation with composure and went on to receive the working tools of an Entered Apprentice Freemason.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  Their journey now begins in earnest. Over the coming months they will work with their Mentors, attend our weekly Lodge of Instruction and prepare for their Second Degree.
                </p>
              </section>

              <section id="festive-board">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Celebrating at the Festive Board</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  The ceremony was followed by a festive board in true Weybridge style — good food, warm company and a genuine sense of welcome for our two new Brethren. The traditional toasts to the Initiates were proposed with affection and answered with characteristic good humour.
                </p>
              </section>

              <section id="future">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Looking Ahead</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  Weybridge Lodge continues to grow steadily, and evenings like this remind us why. If you have ever wondered about Freemasonry — what we do, what we stand for, and what membership might mean for you — we would be very pleased to hear from you.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  <Link to="/join-us" className="text-primary hover:underline font-semibold">
                    Find out about joining Weybridge Lodge →
                  </Link>
                </p>
              </section>
            </article>

            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-sm font-serif text-foreground font-semibold">W Bro. Julien Tidmarsh</p>
              <p className="text-xs text-muted-foreground font-sans mt-1">
                Julien is the Mentor and Communications lead for Weybridge Lodge and has been a member since 2019.
              </p>
            </div>

            <CommentsSection />

            <PostNavigation currentSlug="double-initiation-december-2025" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default DoubleInitiationDecember2025;
