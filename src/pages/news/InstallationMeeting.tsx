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

import heroImg from "@/assets/news/installation-meeting-group.jpg";
import newMasterImg from "@/assets/news/installation-new-master.jpg";
import wardensImg from "@/assets/news/installation-wardens.jpg";
import jewelImg from "@/assets/news/past-masters-jewel.png";

const tocItems = [
  { id: "installation", label: "What is a Masonic Installation Meeting?" },
  { id: "investing", label: "Investing Officers of the Lodge" },
  { id: "jewel", label: "Past Masters Jewel" },
  { id: "plans", label: "Weybridge Lodge Plans for the Year" },
];

const InstallationMeeting = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Masonic Installation Meeting October 2023 | Guildford"
        description="Weybridge Lodge's Masonic installation meeting in October 2023, welcoming W Bro. Murray Grubb Jnr as the new Master at the South West Surrey Masonic Centre."
        canonical="/news/installation-meeting-october-2023"
        type="article"
        schema={[
          articleSchema({ title: "Masonic Installation Meeting October 2023", date: "2023-10-31", description: "Installation of W Bro. Murray Grubb Jnr as Master.", url: "/news/installation-meeting-october-2023" }),
          breadcrumbSchema([{ name: "Home", url: "/" }, { name: "News", url: "/news" }, { name: "Installation Meeting", url: "/news/installation-meeting-october-2023" }]),
        ]}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Masonic Installation Meeting October 2023"
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
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> 31 October 2023</span>
              <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> W Bro. Julien Tidmarsh</span>
            </motion.div>

            {/* Hero image */}
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              src={heroImg}
              alt="The brethren of Weybridge Lodge No.6787 gathered in the temple after our Installation meeting October 2023"
              className="w-full rounded-sm mb-10"
            />

            <SocialShare url="/news/installation-meeting-october-2023" title="Masonic Installation Meeting October 2023" commentCount={commentCount} />

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
                Well, it's that time of year again that gets every Masonic Lodge excited… the Masonic Installation Meeting for a new Master of the Lodge and in this instance the honour was bestowed to W Bro. Murray Grubb Jnr.
              </p>

              {/* What is a Masonic Installation Meeting? */}
              <section id="installation">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">What is a Masonic Installation Meeting?</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  At Weybridge Lodge this is the first Regular Meeting of the Masonic year. Being our most important meeting, we are all dressed appropriately, bow ties and dinner jackets; who said a Freemason couldn't look suave!
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  A new Master of the Lodge is installed in the Chair of King Solomon and goes through a ceremony in which previous Installed Masters invest the incumbent with his Worshipful Masters Apron, Collar and Jewel. If this is his first time in the chair, his title changes from Brother (Bro.) to Worshipful Brother (W Bro.)
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  Prior to this part of the ceremony all Master Masons and below leave the Temple whilst this final part of the Installation is carried out. When all the excluded members are brought back into the Temple to continue the rest of the meeting, the new Worshipful Master (WM) is seated elegantly in his chair and the Worshipful Master from the previous year takes up the chair to the left of the WM in his new position as Immediate Past Master (IPM).
                </p>
                <img
                  src={newMasterImg}
                  alt="Weybridge Lodge's new Worshipful Master W Bro. Murray Grubb Jnr (left) and his Immediate Past Master W Bro. Richard Smith PPAGSwdB (right)"
                  className="w-full max-w-md mx-auto rounded-sm mt-6"
                  loading="lazy"
                />
                <p className="text-xs text-muted-foreground text-center mt-2 italic">
                  Weybridge Lodge's new Worshipful Master W Bro. Murray Grubb Jnr (left) and his Immediate Past Master W Bro. Richard Smith PPAGSwdB (right)
                </p>
              </section>

              {/* Investing Officers */}
              <section id="investing">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Investing Officers of the Lodge</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  So, we now have a new Worshipful Master and he would have already decided which members will take up which role of the Lodge. After all, like any organisation you need to ensure that you have a full 'team' to keep it going and a Freemasons Lodge is no different.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  Now, there are two types of Officer of the Lodge; progressive and non-progressive. The progressive roles as the term would suggest is for those members that are working their way up to becoming a Worshipful Master. The non-progressive roles are usually the more administrative roles such as Secretary or Treasurer.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  There can be cases where there is a gap in the progression of newer members that a more experienced member may be asked to take on a progressive role for another year even if he has performed that role before.
                </p>
                <img
                  src={wardensImg}
                  alt="Worshipful Master Murray Grubb Jnr with Senior Warden W Bro. Ben Connolly (left) and Junior Warden W Bro. David Poole PPSGD (right)"
                  className="w-full max-w-md mx-auto rounded-sm mt-6"
                  loading="lazy"
                />
                <p className="text-xs text-muted-foreground text-center mt-2 italic">
                  Worshipful Master Murray Grubb Jnr with Senior Warden W Bro. Ben Connolly (left) and Junior Warden W Bro. David Poole PPSGD (right)
                </p>
              </section>

              {/* Past Masters Jewel */}
              <section id="jewel">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Past Masters Jewel</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  It is traditional in Weybridge Lodge to present the outgoing Master with a 'Past Master's Jewel' and we are privileged to own several such jewels which are ceramic and decorated with the 'Bridge over the River Wey' – hence Weybridge – emblem of the Lodge.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  W Bro. Richard Smith PPAGSwdB our Worshipful Master for 2022-23 was thanked by our Master Elect for his services in the preceding year who then made the presentation of the Past Masters Jewel to a round of appreciative applause from the Brethren.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  In simple terms the jewel represents the 47th Problem of Euclid and is meant to represent the progress made in Freemasonry by the recipient having served the Lodge as Master. Euclid was a celebrated mathematician who lived and taught in Alexandria between 260 – 320 b.c. and who wrote a set of thirteen books which were called 'Elements'. These thirteen books contained 465 problems, the 47th of which was known as 'The Pythagorean Theorem'.
                </p>
                <img
                  src={jewelImg}
                  alt="A Past Masters Jewel depicting the bridge over the River Wey at Weybridge between the two columns from the entrance of King Solomon's temple"
                  className="w-full max-w-xs mx-auto rounded-sm mt-6"
                  loading="lazy"
                />
                <p className="text-xs text-muted-foreground text-center mt-2 italic">
                  Example of a Past Masters Jewel. This one was presented in 1980 to W.Bro R Rattle.
                </p>
              </section>

              {/* Plans */}
              <section id="plans">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Weybridge Lodge Plans For The Year</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  So, the new Worshipful Master is comfortably installed but that isn't it for the forthcoming year.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  In December we have a new member (Initiate) joining Weybridge Lodge which is combined with our very festive Festive Board. In February, not only do we celebrate the Lodge's 75th Anniversary, but we also carry out a Second Degree Passing Ceremony.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  May sees us finish our Masonic year with a Third Degree Raising Ceremony, whilst in June, all Master Masons of the Lodge will attend the Province of Surrey AGM at Freemasons Hall in London.
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
            <PostNavigation currentSlug="installation-meeting-october-2023" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default InstallationMeeting;
