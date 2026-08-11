import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { articleSchema, breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, User, ArrowLeft, ArrowRight } from "lucide-react";
import PostNavigation from "@/components/PostNavigation";
import RelatedPosts from "@/components/RelatedPosts";
import SocialShare from "@/components/SocialShare";
import CommentsSection, { commentCount } from "@/components/CommentsSection";

import heroImg from "@/assets/news/modern-freemasonry-recruitment.jpg";

const SLUG = "modern-freemasonry-recruitment";
const TITLE =
  "Freemasonry Is Changing How It Recruits — Here's What Actually Worked at Weybridge";
const DESCRIPTION =
  "English Freemasonry is changing how it recruits — some Provinces are even trying paid Facebook ads. Here's what's actually worked at Weybridge Lodge in Guildford, and why we follow up every enquiry personally.";

const tocItems = [
  { id: "old-rule", label: "The Old Unwritten Rule" },
  { id: "what-worked", label: "What Actually Worked for Us" },
  { id: "after-the-enquiry", label: "What Happens After an Enquiry" },
  { id: "women-freemasonry", label: "Women's Freemasonry" },
  { id: "in-short", label: "In Short" },
];

const ModernFreemasonryRecruitment = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="How Freemasonry Recruits Today"
        description={DESCRIPTION}
        canonical={`/news/${SLUG}`}
        type="article"
        schema={[
          articleSchema({
            title: TITLE,
            date: "2026-08-11",
            description: DESCRIPTION,
            url: `/news/${SLUG}`,
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "News", url: "/news" },
            { name: "How Freemasonry Recruits Today", url: `/news/${SLUG}` },
          ]),
        ]}
      />
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <PageHeader title={TITLE} subtitle="Discover Freemasonry" />

        <section className="py-16 md:py-24 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            {/* Meta */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8"
            >
              <Link
                to="/news"
                className="inline-flex items-center gap-1 text-primary hover:underline font-sans"
              >
                <ArrowLeft className="h-4 w-4" /> Back to News
              </Link>
              <span className="hidden sm:inline">|</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> 11 August 2026
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> W Bro. Julien Tidmarsh
              </span>
            </motion.div>

            {/* Hero image */}
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              src={heroImg}
              width={1200}
              height={675}
              alt="A phone showing a social media feed inside a Masonic hall — Freemasonry's changing approach to recruitment"
              className="w-full rounded-sm mb-10"
            />

            <SocialShare
              url={`/news/${SLUG}`}
              title={TITLE}
              commentCount={commentCount}
            />

            {/* Table of Contents */}
            <motion.nav
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              aria-label="Table of contents"
              className="mb-12 p-6 border border-border rounded-sm bg-card"
            >
              <h2 className="text-lg font-serif text-foreground mb-3">
                Table of Contents
              </h2>
              <ol className="list-decimal list-inside space-y-1.5">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="text-sm font-sans text-primary hover:underline"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </motion.nav>

            {/* Article body */}
            <article className="prose-custom space-y-10">
              <section id="old-rule">
                <p className="text-muted-foreground font-sans leading-relaxed">
                  For centuries, the unwritten rule was simple: a man doesn't ask to
                  join the Freemasons — he waits to be asked. That's part of what gave
                  Freemasonry its reputation for secrecy, fairly or not.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  That's been changing, changing fast, and it's now making headlines.
                  National coverage this year has reported English lodges increasingly
                  turning to social media and open recruitment, with some Provinces even
                  trialling paid Facebook advertising, as the movement looks for new
                  ways to reach people who'd never otherwise find a route in.
                </p>
              </section>

              <section id="what-worked">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">
                  What Actually Worked for Us
                </h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  We tried it too — after all, we're in a connected world where apps and
                  websites are viewed on every commute to and from work, to say the
                  least. A small trial budget, just to see. What we found was that it
                  wasn't really necessary. The thing that's actually brought us new
                  members, and a genuine pipeline of people currently considering
                  joining us, is simpler: being consistently active on social media with
                  normal, everyday posts, paired with a website that actually explains
                  what we do. After all, if people can see what Freemasonry actually
                  does in local communities, that answers half the questions before
                  they're even asked — and does a lot of the hard promoting work for us.
                </p>
              </section>

              <section id="after-the-enquiry">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">
                  What Happens After an Enquiry
                </h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  But we think there's a second half to this that matters just as much:
                  what happens after someone takes that first step. If someone has taken
                  the time to browse our site, read through what we're about, and fill
                  in an enquiry form, that deserves the same courtesy in return — not
                  silence, and not a generic auto-reply. So at Weybridge, every enquiry
                  gets:
                </p>
                <ul className="list-disc list-inside text-muted-foreground font-sans space-y-2 mt-4">
                  <li>
                    A follow-up phone call, not just an email — a chance to introduce the
                    Lodge properly and answer whatever's on your mind
                  </li>
                  <li>
                    An information guide sent over, so you've got something to actually
                    read and think about, not just a form to fill in
                  </li>
                  <li>A realistic timeframe, explained honestly from the start</li>
                </ul>
              </section>

              <section id="women-freemasonry">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">
                  Women's Freemasonry
                </h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  And if you're a woman reading this and wondering — yes, you're welcome
                  to get in touch. Women's Freemasonry exists as its own tradition in the
                  UK (the Order of Women Freemasons and Freemasonry for Women), and we're
                  always happy to point you towards a Lodge in Guildford that's the right
                  fit.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  Joining a Lodge isn't a quick sign-up like a gym membership — it's a
                  relationship that develops over months, and we think the way we handle
                  that first enquiry should reflect that from the very first call.
                </p>
              </section>

              <section id="in-short">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">In Short</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  No adverts required — just showing up consistently online, being
                  genuinely informative, and treating every enquiry with the attention it
                  deserves.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  If you've wondered whether Freemasonry is still as closed-off as its
                  reputation suggests, our own experience says the answer is: less and
                  less. Our{" "}
                  <Link to="/faq" className="text-primary hover:underline">
                    FAQ
                  </Link>{" "}
                  covers the questions people usually ask first, and{" "}
                  <Link to="/join-us" className="text-primary hover:underline">
                    Join Us
                  </Link>{" "}
                  is where to start when you're ready.
                </p>
              </section>
            </article>

            {/* Author */}
            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-sm font-serif text-foreground font-semibold">
                W Bro. Julien Tidmarsh
              </p>
              <p className="text-xs text-muted-foreground font-sans mt-1">
                Julien is the current Mentor and Tech Guy for Weybridge Lodge and has
                been a member since 2019.
              </p>
            </div>

            {/* FAQ box */}
            <div className="mt-10 p-6 border border-border rounded-sm bg-card">
              <h2 className="text-lg font-serif text-foreground mb-3">
                Still Have Questions?
              </h2>
              <p className="text-sm text-muted-foreground font-sans leading-relaxed mb-4">
                Our FAQ covers the questions people usually ask first — what Freemasonry is,
                who can join, what it costs, and what happens at meetings.
              </p>
              <Link
                to="/faq"
                className="inline-flex items-center gap-2 text-primary font-sans font-medium hover:underline"
              >
                Read the FAQ <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* CTA */}
            <div className="mt-10 text-center">
              <Link
                to="/join-us"
                className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Start Your Enquiry
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <CommentsSection />

            <RelatedPosts currentSlug={SLUG} category="Discover Freemasonry" />
            <PostNavigation currentSlug={SLUG} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ModernFreemasonryRecruitment;
