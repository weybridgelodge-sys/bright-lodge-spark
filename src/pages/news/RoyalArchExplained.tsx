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

import heroAsset from "@/assets/news/royal-arch-meeting-room.jpg.asset.json";
import chapterJewelsAsset from "@/assets/news/chapter-jewels-a.png.asset.json";
import royalArchApronImg from "@/assets/news/aprons/royal-arch.png";
import royalArchRobesAsset from "@/assets/news/royal-arch-robes.png.asset.json";

const heroImg = heroAsset.url;
const whatIsImg = chapterJewelsAsset.url;

const tocItems = [
  { id: "introduction", label: "Introduction" },
  { id: "what-is", label: "What Is the Royal Arch?" },
  { id: "one-journey", label: "One Journey, One Organisation" },
  { id: "when", label: "When Can I Join?" },
  { id: "in-chapter", label: "What Happens in a Royal Arch Chapter?" },
  { id: "surrey", label: "The Royal Arch in Surrey" },
  { id: "ready", label: "Ready to Complete the Journey?" },
];

const URL = "/news/royal-arch-explained";
const TITLE = "The Royal Arch Explained — One Journey, One Organisation";
const DESCRIPTION =
  "Discover the Royal Arch — the natural completion of Freemasonry's three degrees. Weybridge Lodge No. 6787 in Guildford explains what it means and why UGLE calls it 'one journey, one organisation.'";

const apronImgClass = "mt-6 mx-auto block w-full max-w-xs rounded-sm border border-border bg-card";

const RoyalArchExplained = () => {
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
            { name: "The Royal Arch Explained", url: URL },
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
              alt="Royal Arch Companion's regalia — crimson and royal blue apron and sash displayed formally, with the Triple Tau emblem"
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
              <section id="introduction">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Introduction</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  If you have read our article on the{" "}
                  <Link to="/news/three-masonic-degrees-explained" className="text-primary hover:underline">
                    three Masonic degrees
                  </Link>
                  , you will know that the journey from Entered Apprentice to Master Mason takes most new members around twelve to eighteen months. It is a meaningful, well-structured progression — and for many, it feels like an arrival.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  But in English Freemasonry, it is not quite the destination.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  The United Grand Lodge of England is clear on this point: pure Ancient Masonry consists of the three degrees and the Supreme Order of the Holy Royal Arch. The two are not separate organisations pursuing different ends — they are two parts of the same journey. UGLE's guiding principle says it plainly:
                </p>
                <blockquote className="border-l-4 border-gold pl-4 my-6 italic text-foreground font-serif">
                  One journey. One organisation.
                </blockquote>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  This article explains what the Royal Arch is, what it means, and why so many Freemasons describe joining their Chapter as one of the most significant moments of their Masonic life.
                </p>
              </section>

              <section id="what-is">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">What Is the Royal Arch?</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  The Royal Arch is a separate order within English Freemasonry, administered not by the United Grand Lodge of England but by the{" "}
                  <a
                    href="https://www.ugle.org.uk/about-freemasonry/the-royal-arch"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Supreme Grand Chapter of England
                  </a>
                  . Members meet in a Chapter rather than a Lodge, and the regalia, the officers, and the ceremonial are all distinct from those of Craft Masonry.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  Yet the Royal Arch is not a departure from what has gone before — it is its completion. Where the three Craft degrees use the symbolism of the building of King Solomon's Temple, the Royal Arch ceremony takes the candidate to what was discovered beneath its foundations: a moment of profound revelation that many Companions describe as the most moving experience of their Masonic journey.
                </p>
                <img
                  src={heroImg}
                  alt="Royal Arch Chapter regalia — the setting and dress are deliberately different from a Craft Lodge"
                  loading="lazy"
                  width={1280}
                  height={768}
                  className="mt-6 w-full rounded-sm"
                />
                <p className="text-xs text-muted-foreground font-sans italic mt-2 text-center">
                  Royal Arch regalia — deliberately distinct from Craft Masonry, reflecting the connected but separate nature of the two orders.
                </p>
              </section>

              <section id="one-journey">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">One Journey, One Organisation</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  For much of Freemasonry's modern history, the Royal Arch was treated as something separate — an optional extra that a Mason might or might not pursue after completing his third degree. UGLE has worked hard in recent years to change that perception, and rightly so.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  The principle of <em>one journey, one organisation</em> reflects a simple truth: the three Craft degrees and the Royal Arch were never meant to be divided. Together they form a complete system of moral and philosophical teaching. The Craft degrees lay the foundations; the Royal Arch completes the building.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  At Weybridge Lodge No. 6787, we actively encourage every Master Mason to consider joining a Royal Arch Chapter. We see it not as an add-on to Freemasonry, but as the natural next step in a journey that began on the night of Initiation.
                </p>
                <img
                  src={royalArchApronImg}
                  alt="Royal Arch Companion's apron and sash — the mark of a complete Masonic journey"
                  loading="lazy"
                  className={apronImgClass}
                />
                <p className="text-xs text-muted-foreground font-sans italic mt-2 text-center">
                  The regalia of a Royal Arch Companion — a step beyond the Master Mason's apron.
                </p>
              </section>

              <section id="when">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">When Can I Join?</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  Members of Weybridge Lodge are eligible to join a Royal Arch Chapter just one month after being raised to the degree of Master Mason — making it possible to complete the full journey within the first two years of membership for those who wish to.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  Joining a Chapter does not replace Lodge membership — most Royal Arch Companions remain active in both, and many find that the two complement each other in ways that enrich their experience of Freemasonry as a whole.
                </p>
              </section>

              <section id="in-chapter">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">What Happens in a Royal Arch Chapter?</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  Without revealing what is properly reserved for the ceremony itself, a Chapter meeting follows a broadly similar structure to a Lodge meeting: there is an opening, ceremonial business, and a convivial dinner or supper afterwards.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  The principal officers of a Chapter are the Three Principals — the First, Second, and Third Principal — who preside jointly over the Chapter in a way that has no direct parallel in Craft Masonry. The ceremony of Exaltation, by which a new Companion is received into the Chapter, is widely regarded as the most dramatic and thought-provoking of all Masonic ceremonies.
                </p>
                <figure className="mt-6">
                  <img
                    src={royalArchRobesAsset.url}
                    alt="Robes of the Three Principals — scarlet, blue, and purple with gold trim and white panels"
                    className="w-full rounded-lg border border-gold/20"
                    loading="lazy"
                  />
                  <figcaption className="text-sm text-muted-foreground font-sans mt-2 italic text-center">
                    The robes of the Three Principals — scarlet, blue, and purple — worn during Chapter ceremonies.
                  </figcaption>
                </figure>
              </section>

              <section id="surrey">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">The Royal Arch in Surrey</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  In the{" "}
                  <a
                    href="https://www.surreymason.org.uk/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Province of Surrey
                  </a>
                  , Royal Arch Chapters meet across the county, many of them closely associated with their parent Craft Lodges. Members of Weybridge Lodge No. 6787 who are interested in the Royal Arch will find a warm welcome waiting — and brethren within the lodge who are happy to answer questions and make introductions.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  The Provincial Grand Chapter of Surrey oversees all Royal Arch working in the Province, and further information is available through the Surrey Masonic website.
                </p>
              </section>

              <section id="ready">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Ready to Complete the Journey?</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  If you are already a Master Mason and have not yet joined a Royal Arch Chapter, we would encourage you to ask about it at your next Lodge meeting. If you are not yet a Freemason but are curious about the path ahead, the Royal Arch is one of many reasons why the journey is worth beginning.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  At Weybridge Lodge, we believe that Freemasonry is most rewarding when it is experienced fully — and that means embracing the whole of it: one journey, one organisation, from the first step of Initiation to the completion of the Royal Arch.
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

            <RelatedPosts currentSlug="royal-arch-explained" category="Discover Freemasonry" />
            <PostNavigation currentSlug="royal-arch-explained" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default RoyalArchExplained;
