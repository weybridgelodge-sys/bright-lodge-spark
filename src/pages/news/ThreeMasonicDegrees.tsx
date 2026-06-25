import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { articleSchema, breadcrumbSchema } from "@/components/SEO";
import PostNavigation from "@/components/PostNavigation";
import RelatedPosts from "@/components/RelatedPosts";
import SocialShare from "@/components/SocialShare";
import CommentsSection, { commentCount } from "@/components/CommentsSection";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, User, ArrowLeft } from "lucide-react";

import heroImg from "@/assets/news/three-masonic-degrees.jpg";
import enteredApprenticeImg from "@/assets/news/aprons/entered-apprentice.png";
import fellowCraftImg from "@/assets/news/aprons/fellow-craft.png";
import masterMasonImg from "@/assets/news/aprons/master-mason.png";
import royalArchImg from "@/assets/news/aprons/royal-arch.png";

const tocItems = [
  { id: "overview", label: "An Overview of the Three Degrees" },
  { id: "first-degree", label: "The First Degree — Entered Apprentice" },
  { id: "second-degree", label: "The Second Degree — Fellow Craft" },
  { id: "third-degree", label: "The Third Degree — Master Mason" },
  { id: "royal-arch", label: "The Royal Arch — Completing the Journey" },
  { id: "journey", label: "A Lifelong Journey" },
];

const apronImgClass = "mt-6 mx-auto block w-full max-w-xs rounded-sm border border-border bg-card";

const URL = "/news/three-masonic-degrees-explained";
const TITLE = "The Three Masonic Degrees Explained";
const DESCRIPTION =
  "A clear, modern guide to the three degrees of Freemasonry — Entered Apprentice, Fellow Craft and Master Mason — and what each one means for a new member of Weybridge Lodge No. 6787 in Guildford.";

const ThreeMasonicDegrees = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title={TITLE}
        description={DESCRIPTION}
        canonical={URL}
        type="article"
        schema={[
          articleSchema({
            title: TITLE,
            date: "2026-06-25",
            description: DESCRIPTION,
            url: URL,
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "News", url: "/news" },
            { name: "Three Masonic Degrees Explained", url: URL },
          ]),
        ]}
      />

      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader title={TITLE} subtitle="Discover Freemasonry" />

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
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> 25 June 2026</span>
              <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> W Bro. Julien Tidmarsh</span>
            </motion.div>

            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              src={heroImg}
              alt="Symbols of the three degrees of Freemasonry — a 24-inch gauge, square and compasses, and an open Volume of the Sacred Law"
              width={1280}
              height={768}
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
                Every new Freemason joins through a series of three ceremonies known as the three degrees. They are not exams or tests — they are quiet, dignified moments of welcome, reflection and personal commitment. Each one builds on the last, and together they shape the way a Mason thinks about himself, his family, his work and the world around him.
              </p>

              <section id="overview">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">An Overview of the Three Degrees</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  The three degrees draw on the language and tools of the medieval stonemasons who built Europe's great cathedrals. We use those tools as symbols — not as a job description — to talk about character, integrity and self-improvement. The progression is gentle and supportive: most members take their three degrees over the course of around twelve to eighteen months, with help from a personal Mentor at every step.
                </p>
              </section>

              <section id="first-degree">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">The First Degree — Entered Apprentice</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  The First Degree, or Initiation, is your formal welcome into Freemasonry. It is a memorable evening — slightly mysterious by tradition, but warm and reassuring throughout. The ceremony introduces the idea that a Mason should be a good man trying to become better, and it presents the symbolic working tools of an Entered Apprentice: the 24-inch gauge, the common gavel and the chisel — reminders to use our time wisely, to control our impulses and to refine our character.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  After Initiation, the new Brother begins to attend our weekly Lodge of Instruction, meet the other members of the Lodge informally, and prepare quietly for the next step.
                </p>
                <img src={enteredApprenticeImg} alt="Entered Apprentice apron — plain white lambskin" loading="lazy" className={apronImgClass} />
              </section>

              <section id="second-degree">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">The Second Degree — Fellow Craft</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  The Second Degree, or Passing, focuses on the value of learning. Where the First Degree spoke about character, the Second speaks about the mind — the idea that a thoughtful, curious life is part of being a good man. Its working tools — the square, the level and the plumb rule — encourage fairness, equality and uprightness in our dealings with others.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  By this stage, most new members feel comfortable in the Lodge, know the other Brethren by name, and have begun to find their own way of contributing.
                </p>
                <img src={fellowCraftImg} alt="Fellow Craft apron — white with two pale-blue rosettes" loading="lazy" className={apronImgClass} />
              </section>

              <section id="third-degree">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">The Third Degree — Master Mason</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  The Third Degree, or Raising, is the most reflective of the three. It invites the candidate to think about life's bigger questions — duty, legacy, mortality and the way we want to be remembered. Its working tools — the skirret, the pencil and the compasses — speak about planning a life with care, recording our intentions honestly, and keeping ourselves within proper limits.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  On completion of the Third Degree, the new Master Mason is a full member of the Lodge with every right and responsibility that membership brings.
                </p>
                <img src={masterMasonImg} alt="Master Mason apron — pale blue with three rosettes and tassels" loading="lazy" className={apronImgClass} />
              </section>

              <section id="royal-arch">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">The Royal Arch — Completing the Journey</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  In English Freemasonry, the three degrees are not quite the end of the story. The United Grand Lodge of England teaches that pure Ancient Masonry consists of the three degrees including the Supreme Order of the Holy Royal Arch — often described as the fourth degree, though officially regarded as the natural completion of the Third.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  Joining a Royal Arch Chapter is something most Master Masons are encouraged to consider, and many describe it as among the most significant steps of their Masonic journey. Members of Weybridge Lodge are eligible to join one month after being raised to the degree of Master Mason.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  We will be publishing a dedicated article on the Royal Arch shortly — watch this space.
                </p>
                <img src={royalArchImg} alt="Royal Arch Companion apron — crimson and blue with the Triple Tau emblem" loading="lazy" className={apronImgClass} />
              </section>

              <section id="journey">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">A Lifelong Journey</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  Although there are only three degrees, Freemasonry itself is a lifelong journey. New members of Weybridge Lodge are supported by an experienced Mentor, by our weekly Lodge of Instruction, and by a friendly group of Brethren — aged from 18 to 80 — who genuinely enjoy each other's company. If any of this resonates with you, we would be very pleased to hear from you.
                </p>
                <p className="mt-6">
                  <Link
                    to="/join-us"
                    className="inline-flex items-center gap-2 bg-gold-shimmer text-accent-foreground px-5 py-2.5 rounded-sm text-sm font-semibold font-sans hover:opacity-90 transition-opacity"
                  >
                    Find out about joining Weybridge Lodge →
                  </Link>
                </p>
              </section>
            </article>

            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-sm font-serif text-foreground font-semibold">W Bro. Julien Tidmarsh</p>
              <p className="text-xs text-muted-foreground font-sans mt-1">
                W Bro. Julien Tidmarsh is the Worshipful Master of Weybridge Lodge No. 6787 and leads the lodge's communications. He has been a Freemason since 2019.
              </p>
            </div>

            <CommentsSection />

            <RelatedPosts currentSlug="three-masonic-degrees-explained" category="Discover Freemasonry" />
            <PostNavigation currentSlug="three-masonic-degrees-explained" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ThreeMasonicDegrees;
