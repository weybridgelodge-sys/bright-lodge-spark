import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
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

interface OfficerJewel {
  id?: string;
  image: string;
  title: string;
  description: ReactNode;
  alt: string;
}

const progressiveOfficers: OfficerJewel[] = [
  {
    image: stewardImg,
    title: "Steward",
    alt: "Masonic Lodge Officers Jewel - Stewards Jewel",
    description: "This is likely to be the first office one has in the Lodge. The Stewards' main function is an integral part of a successful Festive Board (dinner) after Lodge, as in many Lodges the Stewards will be responsible for arranging the evening, serving drinks, conducting a raffle etc. It is a very good way to meet the members.",
  },
  {
    image: igImg,
    title: "Inner Guard",
    alt: "Masonic Lodge Officers Jewel - Inner Guards Jewel",
    description: "The Inner Guard sits just inside the door of the Lodge. He admits proven brethren into the Lodge, advises when there is a Candidate or Member wishing to enter the Lodge and checks that everything is in order before entrance is allowed.",
  },
  {
    image: deaconImg,
    title: "Junior Deacon",
    alt: "Masonic Lodge Officers Jewel - Deacons Jewel",
    description: "The Deacons look after and guide the Candidates during ceremonies. Their duties are carried out with care and dignity. The enjoyment and understanding of a new member can be greatly enhanced by the sympathetic attitude of the Deacons and by the efficiency of their working. They have one of the most interesting and delightful roles, which involves both learning ritual and floor-work. They also carry a wand as a badge of office.",
  },
  {
    image: deaconImg,
    title: "Senior Deacon",
    alt: "Masonic Lodge Officers Jewel - Deacons Jewel",
    description: "The Senior Deacon acts as the personal attendant to the Worshipful Master and carries out his commands. He also assists in the ceremonies by conducting candidates and carrying messages between the Master and the Senior Warden. Like the Junior Deacon, he carries a wand as a badge of office.",
  },
  {
    image: jwImg,
    title: "Junior Warden",
    alt: "Masonic Lodge Officers Jewel - Junior Wardens Jewel",
    description: "The Junior Warden sits in the South of the Lodge and will normally progress to Senior Warden. It is the role of the Junior Warden to ensure that no unqualified person enters the Lodge. He works with the Master and Senior Warden in running the Lodge.",
  },
  {
    image: swImg,
    title: "Senior Warden",
    alt: "Masonic Lodge Officers Jewel - Senior Wardens Jewel",
    description: "The Senior Warden sits opposite the Master at the West end of the Lodge and is usually the next Master. He works with the Master and Junior Warden in running the Lodge.",
  },
  {
    image: masterImg,
    title: "Worshipful Master",
    alt: "Masonic Lodge Officers Jewel - Worshipful Masters Jewel",
    description: (
      <>
        The Master is elected by the Lodge members every year and is then installed in to his office. He sits at the East end of the Lodge and is usually Master for one year. He is in charge of the Lodge during his tenure of office and acts as its chairman. He also normally conducts the ceremonies in the Lodge. Being elected and installed as Master is the highest honour a Lodge can bestow on any of its members.
        <br /><br />
        To see every brother who has served as Worshipful Master of Weybridge Lodge since our consecration in 1949, visit our{" "}
        <Link to="/worshipful-masters" className="text-gold hover:underline font-medium">
          Roll of Honour →
        </Link>.
      </>
    ),
  },
];

const nonProgressiveOfficers: OfficerJewel[] = [
  {
    image: ipmImg,
    title: "Immediate Past Master (IPM)",
    alt: "Masonic Lodge Officers Jewel - Immediate Past Masters Jewel",
    description: "After his year as Master of the Lodge, a Mason becomes the Immediate Past Master (IPM). Strictly speaking, the IPM is not an Officer of the Lodge, but his position is an important one as it is his responsibility to sit beside the Master; both in the Lodge Room and the Festive Board, and give him support and guidance when required.",
  },
  {
    image: chaplainImg,
    title: "Chaplain",
    alt: "Masonic Lodge Officers Jewel - Chaplains Jewel",
    description: "Whilst the discussion of religion (and politics) is not permitted within our meetings, each one opens and closes with prayer. Many Lodges that have no members of the clergy amongst their number appoint one of their senior Masons to the office.",
  },
  {
    image: treasurerImg,
    title: "Treasurer",
    alt: "Masonic Lodge Officers Jewel - Treasurers Jewel",
    description: "As you would imagine, the Treasurer is responsible for the finances of the Lodge. Annually, he produces a financial summary report which is audited by the elected Lodge Auditors. It is the responsibility of each member to pay his subscriptions, together with any dining charges, promptly. The Treasurer settles any debts incurred by the Lodge, such as the Lodge rent for the building where meetings are held, the various levies imposed by Grand Lodge, Provincial Grand Lodge and dining expenditure. The Treasurer requires sound judgement, for ultimately, it is on his recommendation that the level of subscriptions for the members is set.",
  },
  {
    image: secretaryImg,
    title: "Secretary",
    alt: "Masonic Lodge Officers Jewel - Secretaries Jewel",
    description: "The Secretary has hands-on daily administration of all matters connected with the smooth running of the Lodge. He is effectively the conduit between Grand Lodge, Provincial Grand Lodge and the Lodge. He receives the mail addressed to the Lodge and submits returns detailing the membership, ceremonies conducted and matters associated with the day-to-day affairs of the Lodge. Normally a Secretary holds the post for a number of years, providing continuity and experience for successive Masters. It is the Secretary's duty to organise the summons and distribute them. An experienced Secretary will advise on any problems or queries.",
  },
  {
    image: dcImg,
    title: "Director of Ceremonies (DC)",
    alt: "Masonic Lodge Officers Jewel - Director of Ceremonies Jewel",
    description: (
      <>
        The DC should have a love of ritual; as his title implies, his function is to direct the ceremonial aspects of our meetings. As in public life when ceremonial is required, such as State Funeral or Royal Wedding, the important events call for meticulous planning, rehearsal and organising for the requirements of the occasion. The DC's role is to make certain that ceremonies are efficiently conducted with dignity and decorum and that all concerned are aware in advance of what they have to do. The Assistant Director of Ceremonies helps the DC and acts as his understudy — see the{" "}
        <a href="#adc" className="text-gold hover:underline font-medium">ADC role below</a>.
      </>
    ),
  },
  {
    image: mentorImg,
    title: "Mentor",
    alt: "Masonic Lodge Officers Jewel - Mentors Jewel",
    description: "It is the responsibility of every Lodge to look after its members. The Lodge Mentor has a vital role to play, as it is his responsibility to ensure that the Mentoring process is not only implemented, but that it also works effectively in his Lodge. The Lodge Mentor needs to ensure that a Mentor is appointed for every Candidate.",
  },
  {
    image: membershipOfficerImg,
    title: "Lodge Membership Officer",
    alt: "Masonic Lodge Officers Jewel - Lodge Membership Officers Jewel",
    description: "The Lodge Membership Officer leads the Lodge's approach to attracting, welcoming and retaining members. He works to ensure that candidates are identified and supported through the joining process, that new members feel welcomed from their first steps, and that the Lodge remains an active and growing community. This is a relatively modern office that reflects the importance Weybridge Lodge places on its future — ensuring that the fellowship, traditions and values of the Lodge are passed on to each new generation of Freemasons.",
  },
  {
    image: almonerImg,
    title: "Almoner",
    alt: "Masonic Lodge Officers Jewel - Almoners Jewel",
    description: "The Almoner is effectively the Lodge Welfare Officer, as it is he who maintains contact with the brethren who through age or infirmity are unable to attend meetings, with Lodge widows and with the members suffering from illness. He should have knowledge of the variety of resources that exist in time of need. The Almoner would organise petitions for assistance in cases of extreme need, and generally be on the lookout for signs of distress or loneliness among the members of the Lodge or their dependants.",
  },
  {
    image: charityImg,
    title: "Charity Steward",
    alt: "Masonic Lodge Officers Jewel - Charity Stewards Jewel",
    description: "The Charity Steward is responsible for co-ordinating the Lodge's charitable affairs in the most efficient way. He should have knowledge of the various methods of making donations and will be happy to give help and advice to the members on these matters. A part of the Charity Steward's role is to encourage members to donate charitably within their means to support masonic and non-masonic good causes.",
  },
  {
    image: asstSecretaryImg,
    title: "Assistant Secretary",
    alt: "Masonic Lodge Officers Jewel - Assistant Secretaries Jewel",
    description: "The role of the Assistant Secretary is to assist the Secretary in his duty and in most Lodges, also serves as the Dining Steward. This part of the role is responsible for managing and organising the dining including looking after the Stewards.",
  },
  {
    id: "adc",
    image: asstdcImg,
    title: "Assistant Director of Ceremonies (ADC)",
    alt: "Masonic Lodge Officers Jewel - Assistant Director of Ceremonies Jewel",
    description: "The Assistant Director of Ceremonies assists the Director of Ceremonies in his role which will include escorting and presenting Visitors. The ADC normally moves into the role of DC after several years.",
  },
  {
    image: organistImg,
    title: "Organist",
    alt: "Masonic Lodge Officers Jewel - Organists Jewel",
    description: (
      <>
        The Organist provides the musical accompaniment that sets the tone and dignity of Lodge proceedings — from the opening of the meeting to the processional moments within ceremonies. Many Lodges are fortunate to have a skilled musician among their members; others rely on professional organists or recorded music.
        <br /><br />
        Weybridge Lodge has a proud organist tradition. Our early historian records Haydn Noakes — who lived at Ripley and ran one of the most powerful amateur radio transmitters in Britain — as a long-serving Lodge Organist, succeeded by Stan Whitfield. That tradition of musical service remains part of the Lodge's character today.
      </>
    ),
  },
  {
    image: tylerImg,
    title: "Tyler",
    alt: "Masonic Lodge Officers Jewel - Tylers Jewel",
    description: "The Tyler guards the outside of the door to the Lodge. This is an elected office. It is often carried out by a senior and experienced member of the fraternity, as he is the officer who prepares the new member for the ceremonies, and should make sure that he understands the specific items in which he has been instructed. The Tyler is not necessarily a member of the Lodge.",
  },
];

const JewelCard = ({ officer, index }: { officer: OfficerJewel; index: number }) => (
  <motion.div
    id={officer.id}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.05 }}
    className="flex flex-col sm:flex-row items-start gap-5 sm:gap-6 py-6 border-b border-border last:border-b-0 scroll-mt-24"
  >
    <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center">
      <img
        src={officer.image}
        alt={officer.alt}
        className="w-full h-full object-contain"
        loading="lazy"
      />
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-serif text-foreground mb-2">{officer.title}</h3>
      {officer.description && (
        <div className="text-foreground/80 font-sans text-sm leading-relaxed">{officer.description}</div>
      )}
    </div>
  </motion.div>
);

const OfficersJewels = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Officers' Roles and Jewels | Weybridge Lodge No. 6787 | Freemasons in Guildford"
        description="Discover the roles, responsibilities and jewels of every officer of a Masonic Lodge — explained by Weybridge Lodge No. 6787, meeting in Guildford, Surrey."
        canonical="/officers-jewels"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Discover Freemasonry", url: "/what-is-freemasonry" },
          { name: "Officers' Roles and Jewels", url: "/officers-jewels" },
        ])}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Officers' Roles and Jewels"
          subtitle="The officers, roles and regalia of Weybridge Lodge No. 6787, Guildford"
        />

        {/* Introduction */}
        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="h-0.5 w-16 bg-gold mb-6" />
              <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-4">
                The Officers' Roles within the Masonic Lodge
              </h2>
              <p className="text-foreground/80 font-sans leading-relaxed mb-4">
                In every Masonic Lodge, officers are appointed each year at the Installation of the new Master. At Weybridge Lodge, these fall into two categories: Progressive and Non-Progressive.
              </p>
              <p className="text-foreground/80 font-sans leading-relaxed mb-4">
                Progressive offices form the ladder that a brother climbs from his earliest years in the Lodge — beginning as Steward, moving through Inner Guard and the Deacons, then to Junior and Senior Warden, and finally to the Chair of the Master itself. Each step brings new responsibilities, new ritual to learn, and a deeper understanding of the craft.
              </p>
              <p className="text-foreground/80 font-sans leading-relaxed mb-4">
                Non-Progressive offices are typically held by experienced Past Masters, often for several years, providing continuity and institutional knowledge for successive Worshipful Masters. The offices of Treasurer and Tyler are elected by the members of the Lodge rather than appointed by the Master.
              </p>
              <p className="text-foreground/80 font-sans leading-relaxed">
                Below you will find each officer role explained, together with the jewel worn on the turquoise blue collar as a badge of office.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Jewels Intro */}
        <section className="py-12 md:py-16 bg-navy-gradient">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-2xl md:text-3xl font-serif text-primary-foreground mb-4">
                Masonic Lodge Officers Jewels
              </h2>
              <p className="text-primary-foreground/70 font-sans text-sm leading-relaxed">
                Below is a table showing all of the masonic lodge officers jewels used at Weybridge Lodge together with a description of each office itself. The jewels are worn around the neck by a turquoise blue collar decorated with silver braid.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Progressive Officers */}
        <section className="py-16 md:py-24 bg-warm-white" aria-labelledby="progressive-heading">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <div className="h-0.5 w-16 bg-gold mb-6" />
              <h2 id="progressive-heading" className="text-2xl md:text-3xl font-serif text-foreground">
                Progressive Officers
              </h2>
            </motion.div>
            <div>
              {progressiveOfficers.map((officer, i) => (
                <JewelCard key={officer.title} officer={officer} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Non-Progressive Officers */}
        <section className="py-16 md:py-24 bg-card" aria-labelledby="non-progressive-heading">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <div className="h-0.5 w-16 bg-gold mb-6" />
              <h2 id="non-progressive-heading" className="text-2xl md:text-3xl font-serif text-foreground">
                Non-Progressive Officers
              </h2>
            </motion.div>
            <div>
              {nonProgressiveOfficers.map((officer, i) => (
                <JewelCard key={officer.title} officer={officer} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20 bg-navy-gradient">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl md:text-3xl font-serif text-primary-foreground mb-4">
                Meet Our Current Officers
              </h2>
              <p className="text-primary-foreground/70 font-sans text-sm mb-8">
                See who currently holds each office at Weybridge Lodge No. 6787.
              </p>
              <Link
                to="/officers"
                className="inline-block bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Current Officers of the Lodge
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default OfficersJewels;
