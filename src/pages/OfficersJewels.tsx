import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import stewardImg from "@/assets/jewels/steward.webp";
import igImg from "@/assets/jewels/ig.webp";
import deaconImg from "@/assets/jewels/deacon.webp";
import jwImg from "@/assets/jewels/jw.webp";
import swImg from "@/assets/jewels/sw.webp";
import masterImg from "@/assets/jewels/master.webp";
import ipmImg from "@/assets/jewels/ipm.webp";
import chaplainImg from "@/assets/jewels/chaplain.webp";
import treasurerImg from "@/assets/jewels/treasurer.webp";
import secretaryImg from "@/assets/jewels/secretary.webp";
import dcImg from "@/assets/jewels/dc.webp";
import mentorImg from "@/assets/jewels/mentor.webp";
import membershipOfficerImg from "@/assets/jewels/membership_officer.png";
import almonerImg from "@/assets/jewels/almoner.webp";
import charityImg from "@/assets/jewels/charity.webp";
import asstSecretaryImg from "@/assets/jewels/asst_secretary.webp";
import asstdcImg from "@/assets/jewels/asstdc.webp";
import organistImg from "@/assets/jewels/organist.webp";
import tylerImg from "@/assets/jewels/tyler.webp";

// ─── Interface ────────────────────────────────────────────────────────────────
interface OfficerJewel {
  id?: string;
  image: string;
  title: string;
  description: ReactNode;
  alt: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const progressiveOfficers: OfficerJewel[] = [
  {
    image: stewardImg,
    title: "Steward",
    alt: "Masonic Lodge Officers Jewel — Stewards Jewel",
    description: "This is likely to be the first office one holds in the Lodge. The Stewards' main function is an integral part of a successful Festive Board after Lodge — in many Lodges the Stewards will be responsible for arranging the evening, serving drinks, conducting a raffle and so on. It is a very good way to meet the members of our Masonic Lodge in Guildford.",
  },
  {
    image: igImg,
    title: "Inner Guard",
    alt: "Masonic Lodge Officers Jewel — Inner Guards Jewel",
    description: "The Inner Guard sits just inside the door of the Lodge. He admits proven brethren into the Lodge, advises when there is a Candidate or Member wishing to enter the Lodge, and checks that everything is in order before entrance is allowed.",
  },
  {
    image: deaconImg,
    title: "Junior Deacon",
    alt: "Masonic Lodge Officers Jewel — Deacons Jewel",
    description: "The Deacons look after and guide the Candidates during ceremonies. Their duties are carried out with care and dignity. The enjoyment and understanding of a new member can be greatly enhanced by the sympathetic attitude of the Deacons and by the efficiency of their working. They have one of the most interesting and delightful roles, which involves both learning ritual and floor-work. They also carry a wand as a badge of office.",
  },
  {
    image: deaconImg,
    title: "Senior Deacon",
    alt: "Masonic Lodge Officers Jewel — Deacons Jewel",
    description: "The Senior Deacon acts as the personal attendant to the Worshipful Master and carries out his commands. He also assists in the ceremonies by conducting candidates and carrying messages between the Master and the Senior Warden. Like the Junior Deacon, he carries a wand as a badge of office.",
  },
  {
    image: jwImg,
    title: "Junior Warden",
    alt: "Masonic Lodge Officers Jewel — Junior Wardens Jewel",
    description: "The Junior Warden sits in the South of the Lodge and will normally progress to Senior Warden. It is the role of the Junior Warden to ensure that no unqualified person enters the Lodge. He works with the Master and Senior Warden in running the Lodge.",
  },
  {
    image: swImg,
    title: "Senior Warden",
    alt: "Masonic Lodge Officers Jewel — Senior Wardens Jewel",
    description: "The Senior Warden sits opposite the Master at the West end of the Lodge and is usually the next Master. He works with the Master and Junior Warden in running the Lodge.",
  },
  {
    image: masterImg,
    title: "Worshipful Master",
    alt: "Masonic Lodge Officers Jewel — Worshipful Masters Jewel",
    description: (
      <>
        The Master is elected by the Lodge members every year and then installed in office. He sits
        at the East end of the Lodge and is usually Master for one year. He is in charge of the
        Lodge during his tenure and acts as its chairman — also normally conducting the ceremonies.
        Being elected and installed as Master is the highest honour a Lodge can bestow on any of its
        members.
        <br /><br />
        To see every brother who has served as Worshipful Master of Weybridge Lodge since our
        consecration in 1949, visit our{" "}
        <Link to="/worshipful-masters" className="text-gold hover:underline font-medium">
          Roll of Honour →
        </Link>
        .
      </>
    ),
  },
];

const nonProgressiveOfficers: OfficerJewel[] = [
  {
    image: ipmImg,
    title: "Immediate Past Master (IPM)",
    alt: "Masonic Lodge Officers Jewel — Immediate Past Masters Jewel",
    description: "After his year as Master of the Lodge, a Mason becomes the Immediate Past Master (IPM). Strictly speaking, the IPM is not an Officer of the Lodge, but his position is an important one — it is his responsibility to sit beside the Master, both in the Lodge Room and at the Festive Board, and give support and guidance when required.",
  },
  {
    image: chaplainImg,
    title: "Chaplain",
    alt: "Masonic Lodge Officers Jewel — Chaplains Jewel",
    description: "Whilst the discussion of religion and politics is not permitted within our meetings, each one opens and closes with prayer. Many Lodges that have no members of the clergy among their number appoint one of their senior Masons to the office.",
  },
  {
    image: treasurerImg,
    title: "Treasurer",
    alt: "Masonic Lodge Officers Jewel — Treasurers Jewel",
    description: "As you would imagine, the Treasurer is responsible for the finances of the Lodge. Annually he produces a financial summary report audited by the elected Lodge Auditors. It is his responsibility to settle any debts incurred by the Lodge — including rent for our meeting room at the Guildford Masonic Centre, GU2 4DR, levies imposed by Grand Lodge, and dining expenditure. The Treasurer requires sound judgement, as it is ultimately on his recommendation that the level of subscriptions is set.",
  },
  {
    image: secretaryImg,
    title: "Secretary",
    alt: "Masonic Lodge Officers Jewel — Secretaries Jewel",
    description: "The Secretary has hands-on daily administration of all matters connected with the smooth running of the Lodge. He is effectively the conduit between Grand Lodge, Provincial Grand Lodge and the Lodge, receiving mail, submitting returns, and distributing the summons to members. Normally a Secretary holds the post for a number of years, providing continuity and experience for successive Masters.",
  },
  {
    image: dcImg,
    title: "Director of Ceremonies (DC)",
    alt: "Masonic Lodge Officers Jewel — Director of Ceremonies Jewel",
    description: (
      <>
        The DC's function is to direct the ceremonial aspects of our meetings — ensuring ceremonies
        are efficiently conducted with dignity and decorum, and that all concerned are aware in
        advance of what they have to do. As in public life when ceremonial is required — a State
        Funeral or Royal Wedding — the important events call for meticulous planning and rehearsal.
        The Assistant Director of Ceremonies helps the DC and acts as his understudy — see the{" "}
        <a href="#adc" className="text-gold hover:underline font-medium">
          ADC role below
        </a>
        .
      </>
    ),
  },
  {
    image: mentorImg,
    title: "Mentor",
    alt: "Masonic Lodge Officers Jewel — Mentors Jewel",
    description: "It is the responsibility of every Lodge to look after its members. The Lodge Mentor has a vital role to play — ensuring that the mentoring process is both implemented and working effectively, and that a Mentor is appointed for every Candidate who joins our Freemasons Lodge in Guildford.",
  },
  {
    image: membershipOfficerImg,
    title: "Lodge Membership Officer",
    alt: "Masonic Lodge Officers Jewel — Lodge Membership Officers Jewel",
    description: "The Lodge Membership Officer leads the Lodge's approach to attracting, welcoming and retaining members. He works to ensure that candidates are identified and supported through the joining process, that new members feel welcomed from their first steps, and that the Lodge remains an active and growing community — ensuring the fellowship, traditions and values of Weybridge Lodge are passed on to each new generation of Freemasons in Surrey.",
  },
  {
    image: almonerImg,
    title: "Almoner",
    alt: "Masonic Lodge Officers Jewel — Almoners Jewel",
    description: "The Almoner is effectively the Lodge Welfare Officer, maintaining contact with brethren who through age or infirmity are unable to attend meetings, with Lodge widows, and with members suffering from illness. He should have knowledge of the variety of resources that exist in times of need, and would organise petitions for assistance in cases of extreme need.",
  },
  {
    image: charityImg,
    title: "Charity Steward",
    alt: "Masonic Lodge Officers Jewel — Charity Stewards Jewel",
    description: "The Charity Steward is responsible for co-ordinating the Lodge's charitable affairs. He should have knowledge of the various methods of making donations and will be happy to give help and advice to members. Part of his role is to encourage members to donate charitably within their means to support Masonic and non-Masonic good causes across Guildford and Surrey.",
  },
  {
    image: asstSecretaryImg,
    title: "Assistant Secretary",
    alt: "Masonic Lodge Officers Jewel — Assistant Secretaries Jewel",
    description: "The role of the Assistant Secretary is to assist the Secretary in his duty and, in most Lodges, also serves as the Dining Steward — managing and organising the dining and looking after the Stewards at the Festive Board.",
  },
  {
    id: "adc",
    image: asstdcImg,
    title: "Assistant Director of Ceremonies (ADC)",
    alt: "Masonic Lodge Officers Jewel — Assistant Director of Ceremonies Jewel",
    description: "The Assistant Director of Ceremonies assists the Director of Ceremonies — including escorting and presenting Visitors. The ADC normally moves into the role of DC after several years, providing a well-trained succession.",
  },
  {
    image: organistImg,
    title: "Organist",
    alt: "Masonic Lodge Officers Jewel — Organists Jewel",
    description: (
      <>
        The Organist provides the musical accompaniment that sets the tone and dignity of Lodge
        proceedings — from the opening of the meeting to the processional moments within ceremonies.
        Many Lodges are fortunate to have a skilled musician among their members; others rely on
        professional organists or recorded music.
        <br /><br />
        Weybridge Lodge has a proud organist tradition. Our early historian records Haydn Noakes —
        who lived at Ripley and ran one of the most powerful amateur radio transmitters in Britain —
        as a long-serving Lodge Organist, succeeded by Stan Whitfield. That tradition of musical
        service remains part of the Lodge's character today.
      </>
    ),
  },
  {
    image: tylerImg,
    title: "Tyler",
    alt: "Masonic Lodge Officers Jewel — Tylers Jewel",
    description: "The Tyler guards the outside of the door to the Lodge. This is an elected office, often carried out by a senior and experienced member of the fraternity — as he is the officer who prepares the new member for the ceremonies and ensures that everything is in order before proceedings begin. The Tyler is not necessarily a member of the Lodge.",
  },
];

// ─── Sub-component ────────────────────────────────────────────────────────────
// reduce prop added — allows useReducedMotion to be threaded from the page
// without each card needing its own hook call.
// delay capped at 0.3s — previous pattern meant card 19 had a 0.95s delay.
const JewelCard = ({
  officer,
  index,
  reduce,
  keyPrefix,
}: {
  officer: OfficerJewel;
  index: number;
  reduce: boolean;
  keyPrefix: string;
}) => (
  <motion.div
    id={officer.id}
    initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3) }}
    className="flex flex-col sm:flex-row items-start gap-5 sm:gap-6 py-6 border-b border-border last:border-b-0 scroll-mt-24"
  >
    <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center">
      <img
        src={officer.image}
        alt={officer.alt}
        className="w-full h-full object-contain"
        loading="lazy"
        width={96}
        height={96}
      />
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-serif text-foreground mb-2">{officer.title}</h3>
      {officer.description && (
        // text-muted-foreground replaces unapproved text-foreground/80
        <div className="text-muted-foreground font-sans text-sm leading-relaxed">
          {officer.description}
        </div>
      )}
    </div>
  </motion.div>
);

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  static: { opacity: 1, y: 0 },
};

// ─── Component ────────────────────────────────────────────────────────────────
const OfficersJewels = () => {
  const shouldReduceMotion = useReducedMotion();

  const pageSchema = useMemo(() => {
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "What is Freemasonry", url: "/what-is-freemasonry" },
      { name: "Officers' Roles and Jewels", url: "/officers-jewels" },
    ]);

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://www.weybridgelodge.org.uk/officers-jewels#webpage",
        url: "https://www.weybridgelodge.org.uk/officers-jewels",
        name: "Officers' Roles and Jewels | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "Discover the roles, responsibilities and jewels of every officer of a Masonic Lodge — explained by Weybridge Lodge No. 6787, meeting in Guildford, Surrey at GU2 4DR.",
        inLanguage: "en-GB",
        isPartOf: {
          "@id": "https://www.weybridgelodge.org.uk/#website",
        },
      },
      breadcrumb,
    ];
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Officers' Roles and Jewels | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787"
        description="Discover the roles, responsibilities and jewels of every officer of a Masonic Lodge — explained by Weybridge Lodge No. 6787, meeting in Guildford, Surrey."
        canonical="/officers-jewels"
        type="website"
        schema={pageSchema}
      />

      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Header />

      <main id="main-content">

        {/* ── H1 ── */}
        <PageHeader
          title="Officers' Roles and Jewels"
          subtitle="The offices, roles and regalia of a Freemasons Lodge in Guildford — explained by Weybridge Lodge No. 6787"
        />

        {/* ── Introduction ── */}
        <section
          className="py-20 md:py-28 bg-background"
          aria-labelledby="jewels-intro-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
            >
              <div className="h-px w-16 bg-gold mb-6" aria-hidden="true" />
              <h2
                id="jewels-intro-heading"
                className="text-2xl md:text-3xl font-serif text-foreground mb-4"
              >
                How the offices of a Masonic Lodge in Surrey are structured
              </h2>
              {/* text-muted-foreground replaces unapproved text-foreground/80 */}
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                In every Masonic Lodge, officers are appointed each year at the Installation of the
                new Master. At Weybridge Lodge, these fall into two categories: Progressive and
                Non-Progressive.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                Progressive offices form the ladder that a brother climbs from his earliest years in
                the Lodge — beginning as Steward, moving through Inner Guard and the Deacons, then
                to Junior and Senior Warden, and finally to the Chair of the Master itself. Each
                step brings new responsibilities, new ritual to learn, and a deeper understanding of
                the Craft.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                Non-Progressive offices are typically held by experienced Past Masters, often for
                several years, providing continuity and institutional knowledge for successive
                Worshipful Masters. The offices of Treasurer and Tyler are elected by the members of
                the Lodge rather than appointed by the Master.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed">
                Below you will find each officer role explained, together with the jewel worn on the
                turquoise blue collar as a badge of office.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Jewels Banner ── */}
        {/* bg-navy flat: bg-navy-gradient is not a project token */}
        <section
          className="py-12 md:py-16 bg-navy"
          aria-labelledby="jewels-banner-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
            >
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              {/* text-gold replaces unapproved text-primary-foreground */}
              <h2
                id="jewels-banner-heading"
                className="text-2xl md:text-3xl font-serif text-gold mb-4"
              >
                Masonic Lodge Officers' Jewels
              </h2>
              {/* text-gold/70 replaces unapproved text-primary-foreground/70 */}
              <p className="text-gold/70 font-sans text-sm leading-relaxed">
                Below is a guide to all of the Masonic Lodge officers' jewels used at Weybridge
                Lodge, together with a description of each office. The jewels are worn around the
                neck on a turquoise blue collar decorated with silver braid and a silver beehive skep - the beehive being a long-standing Masonic emblem of industry, cooperation and the strength of working together.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Progressive Officers ── */}
        <section
          className="py-16 md:py-24 bg-background"
          aria-labelledby="progressive-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              className="mb-8"
            >
              <div className="h-px w-16 bg-gold mb-6" aria-hidden="true" />
              <h2
                id="progressive-heading"
                className="text-2xl md:text-3xl font-serif text-foreground"
              >
                Progressive Officers — the path to the Chair
              </h2>
            </motion.div>
            <div>
              {progressiveOfficers.map((officer, i) => (
                // keyPrefix prevents key collision with non-progressive section
                // if any title strings are shared between sections.
                <JewelCard
                  key={`progressive-${officer.title}`}
                  officer={officer}
                  index={i}
                  reduce={!!shouldReduceMotion}
                  keyPrefix="progressive"
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Non-Progressive Officers ── */}
        <section
          className="py-16 md:py-24 bg-card border-t border-border"
          aria-labelledby="non-progressive-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              className="mb-8"
            >
              <div className="h-px w-16 bg-gold mb-6" aria-hidden="true" />
              <h2
                id="non-progressive-heading"
                className="text-2xl md:text-3xl font-serif text-foreground"
              >
                Non-Progressive Officers — experience in service
              </h2>
            </motion.div>
            <div>
              {nonProgressiveOfficers.map((officer, i) => (
                <JewelCard
                  key={`non-progressive-${officer.title}`}
                  officer={officer}
                  index={i}
                  reduce={!!shouldReduceMotion}
                  keyPrefix="non-progressive"
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        {/* bg-navy flat: bg-navy-gradient is not a project token.
            Previous version: single button, no heading, no copy — dead end.
            Now: proper section with two next-step options. */}
        <section
          className="py-16 md:py-20 bg-navy"
          aria-labelledby="jewels-cta-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
            >
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              {/* text-gold replaces unapproved text-primary-foreground */}
              <h2
                id="jewels-cta-heading"
                className="text-2xl md:text-3xl font-serif text-gold mb-4"
              >
                See who holds these offices at Weybridge Lodge today
              </h2>
              {/* text-gold/70 replaces unapproved text-primary-foreground/70 */}
              <p className="text-gold/70 font-sans text-sm mb-8">
                Every office described above is currently filled by a serving member of our
                Freemasons Lodge in Guildford. See who holds each role in the current Masonic Year,
                or find out how to begin your own journey through the progressive offices.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  to="/officers"
                  aria-label="View the current officers of Weybridge Lodge No. 6787 for 2025–2026"
                  className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Current Officers of the Lodge
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/join-us"
                  aria-label="Begin your application to join Weybridge Lodge No. 6787 in Guildford"
                  className="inline-flex items-center justify-center bg-transparent text-gold border border-gold/40 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Begin Your Application
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

export default OfficersJewels;
