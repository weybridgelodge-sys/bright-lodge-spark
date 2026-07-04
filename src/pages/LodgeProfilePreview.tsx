import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema, localBusinessSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import pastMastersJewel from "@/assets/news/past-masters-jewel.png";

const meetingDates: string[] = [
  "3rd Wednesday in February",
  "2nd Wednesday in May",
  "3rd Wednesday in October (Installation)",
  "2nd Wednesday in December",
];

const stats: { label: string; value: string }[] = [
  { label: "Lodge Number", value: "6787" },
  { label: "Consecrated", value: "29th January 1949" },
  { label: "Subscribing Members", value: "22 (incl. 1 honorary)" },
  { label: "Average Member Age", value: "53" },
  { label: "Meeting Day", value: "Wednesday" },
  { label: "Meetings Per Year", value: "4" },
  { label: "Most Recent Initiation", value: "13th May 2026" },
  { label: "Province", value: "Surrey" },
];

const values: { name: string; description: string }[] = [
  { name: "Integrity", description: "Members hold themselves to a standard of honesty and moral consistency, on and off the temple floor." },
  { name: "Friendship", description: "Bonds formed at the Lodge are built to last a lifetime, rooted in unity and equity among Brethren." },
  { name: "Respect", description: "For tradition, for each other, and for people of all backgrounds and beliefs who meet the Lodge's criteria for membership." },
  { name: "Service", description: "To fellow members, to Guildford and Surrey, and to national causes such as the Freemasons' Fund for Surgical Research." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay } }),
  static: { opacity: 1, y: 0 },
};

const LodgeProfilePreview = () => {
  const shouldReduceMotion = useReducedMotion();
  const pageSchema = useMemo(() => {
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Lodge Profile", url: "/lodge-profile" },
    ]);
    return [
      { "@context": "https://schema.org", "@type": "WebPage", "@id": "https://www.weybridgelodge.org.uk/lodge-profile#webpage", url: "https://www.weybridgelodge.org.uk/lodge-profile", name: "Lodge Profile", description: "Preview", inLanguage: "en-GB" },
      breadcrumb,
      localBusinessSchema,
    ];
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO title="Lodge Profile Preview" description="Preview" canonical="/lodge-profile-preview" type="website" schema={pageSchema} />
      <Header />
      <main id="main-content">
        <PageHeader title="Lodge Profile" subtitle="Introducing Weybridge Lodge No. 6787 — Freemasons in Guildford, Surrey" />

        <section className="pt-16 pb-4 md:pt-20 md:pb-6 bg-background" aria-labelledby="vision-heading">
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <motion.div variants={fadeUp} initial="hidden" whileInView={shouldReduceMotion ? "static" : "visible"} viewport={{ once: true }} custom={0}>
              <p className="text-gold text-sm font-sans uppercase tracking-wide mb-3">Our Vision</p>
              <h2 id="vision-heading" className="text-xl md:text-2xl font-serif text-foreground leading-snug">
                To be Guildford's most welcoming home for men seeking friendship, purpose, and personal growth — a Lodge where centuries-old tradition actively strengthens the modern Surrey community.
              </h2>
            </motion.div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-background" aria-labelledby="overview-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div variants={fadeUp} initial="hidden" whileInView={shouldReduceMotion ? "static" : "visible"} viewport={{ once: true }} custom={0}>
              <div className="h-px w-16 bg-gold mb-6" aria-hidden="true" />
              <h2 id="overview-heading" className="text-2xl md:text-3xl font-serif text-foreground mb-6">About Weybridge Lodge No. 6787 — Freemasons in Guildford, Surrey</h2>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">Weybridge Lodge No. 6787 is a Lodge of Freemasons meeting in Guildford, Surrey. Founded in 1948 by members of our Mother Lodge, Noel Money No. 2521, and by workers from the Vickers-Armstrong aircraft factory at Brooklands in Weybridge, the Lodge was consecrated on 29th January 1949.</p>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">From those wartime roots — aircraft engineers, local tradesmen, shopkeepers and professionals bound together by a shared Wednesday afternoon — Weybridge Lodge has grown into the diverse, active community it is today. Our 22 members range in age from 18 to 80 and bring with them a wide spectrum of backgrounds, professions and interests. We are proud of our friendliness to new members and visitors alike — those who come to our meetings consistently remark on the warmth of the welcome and the quality of the ceremony, and many return.</p>
              <p className="text-muted-foreground font-sans leading-relaxed">The Lodge holds a strong reputation within the Province of Surrey and plays an active role in Provincial life, including the <Link to="/our-charities" className="text-gold hover:underline">Surrey 2030 Festival</Link> — a major fundraising programme supporting Masonic and non-Masonic charities across the county. In 2026, members of Weybridge Lodge completed the <Link to="/thames-challenge" className="text-gold hover:underline">Thames Towpath Challenge</Link> — 183 miles in 10 days — raising £10,000 for the Festival. That spirit of fellowship in action is what Weybridge Lodge is about. Learn more about <Link to="/history" className="text-gold hover:underline">our history</Link>.</p>
            </motion.div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-background border-t border-border" aria-labelledby="values-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div variants={fadeUp} initial="hidden" whileInView={shouldReduceMotion ? "static" : "visible"} viewport={{ once: true }} custom={0}>
              <div className="h-px w-16 bg-gold mb-6" aria-hidden="true" />
              <h2 id="values-heading" className="text-2xl md:text-3xl font-serif text-foreground mb-8">Our Values</h2>
              <ul className="grid sm:grid-cols-2 gap-8 list-none p-0 m-0">
                {values.map((v) => (
                  <li key={v.name} className="border-l-2 border-gold pl-5">
                    <h3 className="font-serif text-lg text-foreground mb-1">{v.name}</h3>
                    <p className="text-muted-foreground font-sans leading-relaxed text-sm">{v.description}</p>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-24 bg-navy" aria-labelledby="glance-heading">
          <div className="container mx-auto px-6 max-w-4xl">
            <motion.div variants={fadeUp} initial="hidden" whileInView={shouldReduceMotion ? "static" : "visible"} viewport={{ once: true }} custom={0}>
              <p className="text-gold text-sm font-sans uppercase tracking-wide mb-2">By the Numbers</p>
              <h2 id="glance-heading" className="text-2xl md:text-3xl font-serif text-gold mb-10">Lodge at a Glance</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gold/30 border border-gold/30 rounded-sm overflow-hidden">
                {stats.map((s) => (
                  <div key={s.label} className="bg-navy/80 p-5">
                    <dt className="text-xs font-sans uppercase tracking-wider text-gold/60 mb-2">{s.label}</dt>
                    <dd className="text-xl md:text-2xl font-serif text-gold">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-background border-t border-border" aria-labelledby="jewel-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div variants={fadeUp} initial="hidden" whileInView={shouldReduceMotion ? "static" : "visible"} viewport={{ once: true }} custom={0}>
              <div className="h-px w-16 bg-gold mb-6" aria-hidden="true" />
              <h2 id="jewel-heading" className="text-2xl md:text-3xl font-serif text-foreground mb-6">The Past Masters Jewel</h2>
              <p className="text-muted-foreground font-sans leading-relaxed mb-6">Every <Link to="/worshipful-masters" className="text-gold hover:underline">brother who has served as Worshipful Master</Link> of Weybridge Lodge is presented with a Past Masters Jewel — a personal keepsake marking the highest honour the Lodge can bestow. Each jewel is unique to the Lodge and bears the member's name and year of service.</p>
              <figure className="my-8" aria-labelledby="jewel-caption">
                <img src={pastMastersJewel} alt="Past Masters Jewel" className="w-full max-w-xs mx-auto rounded-sm" loading="lazy" />
                <figcaption id="jewel-caption" className="text-xs text-muted-foreground text-center mt-2 italic">Example of a Past Masters Jewel. This one was presented in 1980 to W.Bro R Rattle.</figcaption>
              </figure>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-navy" aria-labelledby="schedule-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div variants={fadeUp} initial="hidden" whileInView={shouldReduceMotion ? "static" : "visible"} viewport={{ once: true }} custom={0}>
              <p className="text-gold text-sm font-sans uppercase tracking-wide mb-2">Meeting Schedule</p>
              <h2 id="schedule-heading" className="text-2xl md:text-3xl font-serif text-gold mb-6">When Do We Meet?</h2>
              <p className="text-gold/70 font-sans leading-relaxed mb-8">Our Lodge meets at the Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford, <span className="font-semibold text-gold">GU2 4DR</span>. We hold four meetings each year, which usually start between 5.30 pm and 6.00 pm.</p>
              <ul className="space-y-3 mb-8 list-none p-0 m-0">
                {meetingDates.map((date) => (
                  <li key={date} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" aria-hidden="true" />
                    <span className="text-gold/70 font-sans">{date}</span>
                  </li>
                ))}
              </ul>
              <p className="text-gold/70 font-sans leading-relaxed">Our December meeting is a particularly special evening, kept specifically for initiating new members — though you would not necessarily need to wait for this date to join. Meetings are followed by a Festive Board — a formal dinner at which the fellowship of the Lodge really comes to life. You can <Link to="/events" className="text-gold hover:underline">view our upcoming meetings</Link> on the events page.</p>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-background border-t border-border" aria-labelledby="quality-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div variants={fadeUp} initial="hidden" whileInView={shouldReduceMotion ? "static" : "visible"} viewport={{ once: true }} custom={0}>
              <div className="h-px w-16 bg-gold mb-6" aria-hidden="true" />
              <h2 id="quality-heading" className="text-2xl md:text-3xl font-serif text-foreground mb-6">A Lodge Built on Quality</h2>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">We currently have 22 members whose ages range from 18 to 80. We welcome men of all ages and backgrounds — whether you are a young professional looking for personal development and new friendships, or more established in your career. Weybridge Lodge prides itself on its friendliness to new members and visitors alike.</p>
              <p className="text-muted-foreground font-sans leading-relaxed">The Lodge has a long-established reputation for the quality of its ceremonies. This is due in no small part to our very active Lodge of Instruction (LoI), which meets every Thursday at 7.30 pm at the Guildford Masonic Centre, GU2 4DR. The LoI is strongly supported by all members, and particularly by our more senior brethren, whose aim is to guide, mentor and entertain our newer members as they learn the Craft.</p>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-background border-t border-border" aria-labelledby="community-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div variants={fadeUp} initial="hidden" whileInView={shouldReduceMotion ? "static" : "visible"} viewport={{ once: true }} custom={0}>
              <div className="h-px w-16 bg-gold mb-6" aria-hidden="true" />
              <h2 id="community-heading" className="text-2xl md:text-3xl font-serif text-foreground mb-6">A Wider Masonic Community</h2>
              <p className="text-muted-foreground font-sans leading-relaxed">We actively encourage our members to visit other Lodges — it is one of the best ways to meet fellow Freemasons, broaden your Masonic circle and experience the Craft from a fresh perspective. Every Lodge operates with its own character, and slight variations in ceremony and ritual make visiting both educational and enjoyable. Weybridge Lodge itself welcomes visiting brethren warmly at every meeting — see our <Link to="/events" className="text-gold hover:underline">upcoming meetings</Link>.</p>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-background border-t border-border" aria-labelledby="social-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div variants={fadeUp} initial="hidden" whileInView={shouldReduceMotion ? "static" : "visible"} viewport={{ once: true }} custom={0}>
              <div className="h-px w-16 bg-gold mb-6" aria-hidden="true" />
              <h2 id="social-heading" className="text-2xl md:text-3xl font-serif text-foreground mb-6">The Social Side</h2>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">Life at Weybridge Lodge extends well beyond the Lodge room. As a Lodge we enjoy a full calendar of social and charitable activities throughout the year.</p>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">Our principal charity event is the Annual Ladies Festival — a black tie charity gala held each year in aid of a cause chosen by the Worshipful Master. Past events have been held at various venues across Guildford and the surrounding areas, raising funds for local charities such as Guildford Young Carers & SANDS.</p>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">More relaxed social activities include darts nights, Topgolf, clay pigeon shoots and bowling. We also actively participate in inter-lodge and Provincial events, with members having recently completed the <Link to="/thames-challenge" className="text-gold hover:underline">Thames Towpath Challenge</Link> — 183 miles along the Thames in 10 days — raising £10,000 for the <Link to="/our-charities" className="text-gold hover:underline">Surrey 2030 Festival</Link>.</p>
              <p className="text-muted-foreground font-sans leading-relaxed">Our December meeting is a highlight of the year: new members are initiated, Christmas hats of every description appear, and the Festive Board ends with a carol or three.</p>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-background border-t border-border" aria-labelledby="members-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div variants={fadeUp} initial="hidden" whileInView={shouldReduceMotion ? "static" : "visible"} viewport={{ once: true }} custom={0}>
              <div className="h-px w-16 bg-gold mb-6" aria-hidden="true" />
              <h2 id="members-heading" className="text-2xl md:text-3xl font-serif text-foreground mb-6">Who Are Our Members?</h2>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">Weybridge Lodge draws its membership from across Surrey and beyond. To give you a sense of the people you would be joining:</p>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4"><span className="font-semibold text-foreground">Professions represented in the Lodge include:</span> Property investors and developers, IT and tech professionals, plumbers, garden landscapers, retired police officers and care home managers — a genuine cross-section of working and professional life in Guildford and across Surrey.</p>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4"><span className="font-semibold text-foreground">Member interests and hobbies include:</span> Clay pigeon shooting, bowls, golf, darts, wine appreciation and local football.</p>
              <p className="text-muted-foreground font-sans leading-relaxed">If you see yourself among that company, we would be very glad to hear from you.</p>
            </motion.div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-background border-t border-border" aria-labelledby="mission-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div variants={fadeUp} initial="hidden" whileInView={shouldReduceMotion ? "static" : "visible"} viewport={{ once: true }} custom={0}>
              <div className="h-px w-16 bg-gold mb-6" aria-hidden="true" />
              <h2 id="mission-heading" className="text-2xl md:text-3xl font-serif text-foreground mb-6">Why Weybridge Lodge?</h2>
              <p className="text-muted-foreground font-sans leading-relaxed mb-6">Weybridge Lodge No. 6787 brings together men of good character from Guildford and the surrounding Surrey area to build lifelong friendships, support one another's personal development, and give practical, generous service to local and national charitable causes — all within the structure and ceremony of English Freemasonry.</p>
              <p className="text-muted-foreground font-sans leading-relaxed">If that sounds like the kind of friendship, structure and purpose you're looking for, the best next step is our <Link to="/first-visit" className="text-gold hover:underline">First Visit Guide</Link> — it walks through exactly what to expect, from enquiry to your first evening at Guildford Masonic Centre.</p>
            </motion.div>
          </div>
        </section>

        <section className="py-16 bg-navy" aria-labelledby="profile-cta-heading">
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
            <motion.div variants={fadeUp} initial="hidden" whileInView={shouldReduceMotion ? "static" : "visible"} viewport={{ once: true }} custom={0}>
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2 id="profile-cta-heading" className="font-serif text-gold text-2xl md:text-3xl mb-3">Like what you see?</h2>
              <p className="text-gold/70 font-sans mb-8">If Weybridge Lodge sounds like your kind of place, take our two-minute quiz, read what to expect on your first visit, or go straight to beginning your application to join our Freemasons Lodge in Guildford.</p>
              <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4">
                <Link to="/join-us" className="inline-flex items-center justify-center gap-2 bg-gold text-navy px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto">Begin Your Application<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                <Link to="/quiz" className="inline-flex items-center justify-center bg-transparent text-gold border border-gold/40 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto">Take the 2-Min Quiz</Link>
                <Link to="/first-visit" className="inline-flex items-center justify-center bg-transparent text-gold border border-gold/40 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto">First Visit Guide</Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LodgeProfilePreview;
