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

import heroAsset from "@/assets/news/surrey-2030-gold-trophy.jpg.asset.json";
const heroImg = heroAsset.url;
import festivalLogo from "@/assets/surrey-2030-gold.png";

const tocItems = [
  { id: "grand-launch", label: "A Grand Launch at Old Thorns" },
  { id: "driving-force", label: "The Driving Force: W Bro. Julien Tidmarsh" },
  { id: "road-to-gold", label: "Weybridge Lodge: The Road to Gold" },
  { id: "what-is-festival", label: "What is the Surrey 2030 Festival?" },
  { id: "who-benefits", label: "Who Benefits? The Impact of Your Giving" },
];

const Surrey2030Gold = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Surrey 2030 Festival Gold Award"
        description="Weybridge Lodge No. 6787 secures the prestigious Gold Festival Award for the Surrey 2030 Festival, raising over £15,800 for the Masonic Charitable Foundation."
        canonical="/news/surrey-2030-festival-gold"
        type="article"
        schema={[
          articleSchema({
            title: "Weybridge Lodge Strikes Gold: Surrey 2030 Festival Success",
            date: "2025-05-10",
            description:
              "Weybridge Lodge secures the Gold Festival Award for the Surrey 2030 Festival, exceeding their £15,300 target within five months.",
            url: "/news/surrey-2030-festival-gold",
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "News", url: "/news" },
            { name: "Surrey 2030 Festival Gold", url: "/news/surrey-2030-festival-gold" },
          ]),
        ]}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Weybridge Lodge Strikes Gold"
          subtitle="Charity"
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
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> 10 May 2025</span>
              <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> Weybridge Lodge</span>
            </motion.div>

            {/* Hero image */}
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              src={heroImg}
              alt="Members of Weybridge Lodge proudly displaying the Gold Festival Award certificate at Freemasons' Hall"
              className="w-full rounded-sm mb-10"
            />

            <SocialShare url="/news/surrey-2030-festival-gold" title="Weybridge Lodge Strikes Gold: Surrey 2030 Festival Success" commentCount={commentCount} />

            {/* Lede */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="text-lg text-muted-foreground font-sans leading-relaxed mb-10"
            >
              Fantastic news for the brethren! Weybridge Lodge has officially secured the prestigious <strong className="text-foreground">Gold Festival Award</strong>, reaching their target in record time.
            </motion.p>

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
              {/* A Grand Launch at Old Thorns */}
              <section id="grand-launch">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">A Grand Launch at Old Thorns</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  The Surrey 2030 Festival was officially set in motion by the Provincial Grand Master, RW Bro. Nicholas Burger, on Saturday, 30th November 2024. The gala launch at the{" "}
                  <a href="https://www.oldthorns.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/40 hover:decoration-primary">
                    Old Thorns Hotel and Resort
                  </a>{" "}
                  marked the start of a five-year fundraising journey designed to unite Surrey Freemasons in a "party with a purpose."
                </p>
              </section>

              {/* The Driving Force */}
              <section id="driving-force">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">The Driving Force: W Bro. Julien Tidmarsh</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  The Lodge's incredible momentum was fueled by the leadership of their current Worshipful Master, W Bro. Julien Tidmarsh. Having been distinguished with the appointment of Vice Chairman of the Surrey 2030 Festival team, W Bro. Tidmarsh's dedication to the cause inspired the members to get behind the appeal from day one, leading by example and driving the Lodge toward its ambitious goals.
                </p>
              </section>

              {/* The Road to Gold */}
              <section id="road-to-gold">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Weybridge Lodge: The Road to Gold</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  While the festival is a long-distance marathon, Weybridge Lodge treated it like a sprint. The Honorifics system set clear milestones for the Lodge:
                </p>
                <div className="grid grid-cols-3 gap-4 my-6">
                  {[
                    { tier: "Bronze", amount: "£7,650", colour: "bg-amber-700/20 text-amber-800 border-amber-700/30" },
                    { tier: "Silver", amount: "£10,200", colour: "bg-zinc-300/30 text-zinc-700 border-zinc-400/40" },
                    { tier: "Gold", amount: "£15,300", colour: "bg-yellow-400/20 text-yellow-900 border-yellow-500/30" },
                  ].map((m) => (
                    <div key={m.tier} className={`rounded-sm border p-4 text-center ${m.colour}`}>
                      <p className="text-xs font-sans font-semibold uppercase tracking-wider mb-1">{m.tier}</p>
                      <p className="text-lg font-serif font-bold">{m.amount}</p>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  In an incredible display of generosity, the Lodge exceeded the Gold target within just <strong className="text-foreground">five months</strong>, raising a total of <strong className="text-foreground">£15,800</strong>. With the festival running until 2030, the Lodge hopes to increase this total to over <strong className="text-foreground">£20,000</strong> before the end of the festival, if not more.
                </p>

                {/* Surrey 2030 Festival Logo */}
                <a href="https://surreyfestival2030.org/" target="_blank" rel="noopener noreferrer" className="block my-8">
                  <img
                    src={festivalLogo}
                    alt="Surrey 2030 Festival logo — a province-wide Masonic fundraising appeal"
                    className="w-44 mx-auto hover:opacity-80 transition-opacity"
                    loading="lazy"
                  />
                </a>
              </section>

              {/* What is the Surrey 2030 Festival? */}
              <section id="what-is-festival">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">What is the Surrey 2030 Festival?</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  The festival is a coordinated, province-wide fundraising appeal lasting until 2030. According to the{" "}
                  <a href="https://surreyfestival2030.org/" target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/40 hover:decoration-primary">
                    Official Surrey Festival Website
                  </a>, its core aims are to:
                </p>
                <ul className="mt-4 space-y-3">
                  {[
                    {
                      title: "Support the MCF",
                      text: "Raise vital funds for the Masonic Charitable Foundation (MCF), which distributes millions annually to those in need.",
                    },
                    {
                      title: "Build Community",
                      text: 'Strengthen the bonds between Craft and Royal Arch through shared events like quizzes, family fun days and even "Gavel Tracking".',
                    },
                    {
                      title: "Encourage Participation",
                      text: "Whether through monthly Regular Giving or individual Stewardship Jewels, every member is invited to contribute at a level comfortable for them.",
                    },
                  ].map((item) => (
                    <li key={item.title} className="flex gap-3 items-start">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                      <p className="text-muted-foreground font-sans leading-relaxed">
                        <strong className="text-foreground">{item.title}:</strong> {item.text}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Who Benefits? */}
              <section id="who-benefits">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Who Benefits? The Impact of Your Giving</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  The funds raised by Weybridge Lodge and others go directly to the MCF, providing life-changing support for both Freemasons and the wider community. Beneficiaries include:
                </p>
                <ul className="mt-4 space-y-3">
                  {[
                    {
                      title: "Local Surrey Charities",
                      text: "Recent grants have supported LinkAble (£35,000 for learning disabilities), Momentum Children's Charity (£60,000) and Wildlife Aid Foundation.",
                    },
                    {
                      title: "National Initiatives",
                      text: "Funding for medical research, hospice care and emergency disaster relief.",
                    },
                    {
                      title: "Youth & Education",
                      text: "Programmes like TalentAid help young people overcome financial barriers to excel in sports, music and education.",
                    },
                  ].map((item) => (
                    <li key={item.title} className="flex gap-3 items-start">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                      <p className="text-muted-foreground font-sans leading-relaxed">
                        <strong className="text-foreground">{item.title}:</strong> {item.text}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground font-sans leading-relaxed mt-6">
                  Congratulations again to all members of Weybridge Lodge for this "Gold-standard" achievement!
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  If you'd like to find out more about the Surrey 2030 Festival or how to contribute, please visit our{" "}
                  <Link to="/contact" className="text-primary underline decoration-primary/40 hover:decoration-primary">Contact</Link>{" "}
                  page or speak to any Lodge member at our next meeting.
                </p>
              </section>
            </article>

            {/* Author */}
            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-sm font-serif text-foreground font-semibold">Weybridge Lodge No. 6787</p>
              <p className="text-xs text-muted-foreground font-sans mt-1">
                Weybridge Lodge meets at the Guildford Masonic Centre in Guildford and has been going strong since 1949.
              </p>
            </div>

            <CommentsSection />

            <RelatedPosts currentSlug="surrey-2030-festival-gold" category="Charity" />
            <PostNavigation currentSlug="surrey-2030-festival-gold" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Surrey2030Gold;
