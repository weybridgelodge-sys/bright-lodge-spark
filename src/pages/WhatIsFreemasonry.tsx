import { useEffect, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import {
  Shield,
  Users,
  Heart,
  HandHelping,
  Landmark,
  UtensilsCrossed,
  GraduationCap,
  ArrowRight,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Principle {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  id: string;
}

interface MeetingPart {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface Degree {
  degree: string;
  title: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

const principles: Principle[] = [
  {
    icon: Shield,
    title: "Integrity",
    subtitle: "Building good people",
    id: "principle-integrity",
    description:
      "Honesty, trustworthiness and conscientiousness form the bedrock of a Freemason's character. Members of our Guildford Lodge are encouraged to act with honour in every aspect of their lives — at home, at work and in their communities. Freemasonry provides a framework of moral teachings that helps each individual hold themselves to the highest standards of conduct, fostering trust and strong principles that extend well beyond the Lodge room.",
  },
  {
    icon: Users,
    title: "Friendship",
    subtitle: "Building together",
    id: "principle-friendship",
    description:
      "Freemasonry opens the door to a remarkably wide circle of friends who share common values and interests. From the moment a new member joins Weybridge Lodge No. 6787 in Guildford, Surrey, they discover a genuine sense of belonging and togetherness that often lasts a lifetime. These bonds cross social, professional and cultural boundaries, creating a supportive network where members celebrate each other's successes and stand alongside one another through life's challenges.",
  },
  {
    icon: Heart,
    title: "Respect",
    subtitle: "Building unity",
    id: "principle-respect",
    description:
      "Since its earliest days, Freemasonry has championed an environment where diversity is genuinely valued. Members come from every walk of life, faith and background, and the organisation actively promotes inclusivity, tolerance and open dialogue. Freemasons at our Lodge in Guildford and across Surrey are encouraged to look beyond perceived differences, creating a space where mutual respect is not simply expected but practised in every interaction.",
  },
  {
    icon: HandHelping,
    title: "Service",
    subtitle: "Building communities",
    id: "principle-service",
    description:
      "Charitable service sits at the very heart of what it means to be a Freemason. Whether organising fundraising events, volunteering in local communities or supporting national causes, members make meaningful contributions by giving their time, resources and skills. Across England and Wales alone, Freemasons donate millions of pounds each year to causes that make a tangible difference — including right here in Guildford and across Surrey.",
  },
];

const meetingParts: MeetingPart[] = [
  {
    icon: Landmark,
    title: "The Lodge",
    description:
      "Freemasonry is organised into smaller units called Lodges, each with its own unique character and history. Weybridge Lodge No. 6787 sits within the Province of Surrey and meets at Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford, GU2 4DR. Every member is free to choose the Lodge they wish to join, and as they progress they are warmly welcomed to visit other Lodges across Surrey and beyond.",
  },
  {
    icon: GraduationCap,
    title: "The Meeting",
    description:
      "Lodge meetings at our Guildford Masonic Centre typically unfold in two parts. The first covers administrative business such as proposing new members, balloting and receiving updates on charitable activities. The second part is ceremonial — this might involve the admittance of a new member, the advancement of an existing one through the degrees, or the installation of the Master of the Lodge and his officers for the coming year.",
  },
  {
    icon: UtensilsCrossed,
    title: "The Festive Board",
    description:
      "True to the spirit of friendship and togetherness, every meeting concludes with a social gathering. At Weybridge Lodge, members retire from the Temple to enjoy drinks before sitting down to a three-course meal — the Festive Board. Toasts are raised, speeches are given, and the evening provides a relaxed setting to strengthen bonds and reflect on shared experiences at our Masonic Lodge in Guildford, Surrey.",
  },
];

const degrees: Degree[] = [
  {
    degree: "First Degree",
    title: "Entered Apprentice",
    description:
      "The journey begins here. This ceremony introduces the candidate to Freemasonry's core values and reminds us of a fundamental truth — that all people are equal, and those who prosper carry a responsibility to support those less fortunate. The new member is received into the Lodge and begins to learn the symbolic language of the Craft.",
  },
  {
    degree: "Second Degree",
    title: "Fellow Craft Freemason",
    description:
      "The second stage encourages members to deepen their understanding through learning and self-improvement. It emphasises the importance of education, intellectual curiosity and personal growth — urging each Freemason to develop their talents and apply them for the benefit of others in their community.",
  },
  {
    degree: "Third Degree",
    title: "Master Mason",
    description:
      "The final degree is the most solemn and meaningful. It teaches members to reflect on how they use their time and to live in a way that leaves a positive legacy. Upon completion, the member becomes a Master Mason — the foundation upon which all further Masonic involvement is built, and the point at which the whole of the Craft opens to them.",
  },
];

const faqItems: FaqItem[] = [
  {
    question: "What is Freemasonry?",
    answer:
      "Freemasonry is one of the world's oldest social and charitable organisations, with roots in the traditions of medieval stonemasons. It brings together men of good character who are committed to integrity, friendship, respect and service.",
  },
  {
    question: "How do I join the Freemasons in Guildford, Surrey?",
    answer:
      "You can begin your application to Weybridge Lodge No. 6787 — our Masonic Lodge in Guildford, GU2 4DR — via the Join Us page on this website. We welcome enquiries from men of all backgrounds and ages.",
  },
  {
    question: "Can anyone join a Masonic Lodge in Surrey?",
    answer:
      "Men of good character and reputation who believe in a Supreme Being, of any faith, are welcome to enquire. Joining involves completing an enquiry form and attending an informal interview at Guildford Masonic Centre — attending a first visit requires completing this application and interview process, it is not an open drop-in.",
  },
  {
    question: "Do I need to know someone already to join?",
    answer:
      "No. Weybridge Lodge explicitly welcomes enquiries from men with no prior connection to Freemasonry — curiosity matters far more than knowing an existing member or having a family history in the Craft.",
  },
  {
    question: "What happens at a Masonic Lodge meeting?",
    answer:
      "Meetings have two parts: a formal Lodge meeting covering ceremony and business, followed by the Festive Board — a three-course dinner with toasts and fellowship.",
  },
  {
    question: "What are the three degrees of Freemasonry?",
    answer:
      "The three degrees are Entered Apprentice (First Degree), Fellow Craft (Second Degree), and Master Mason (Third Degree). Each is a ceremony rich in symbolism and moral teaching.",
  },
  {
    question: "Is Freemasonry a secret society?",
    answer:
      "No. Freemasonry is a society with some private ceremonies, but it is not a secret society. Weybridge Lodge No. 6787 publishes its meeting details, officers and charitable activities openly on this website.",
  },
];

const WhatIsFreemasonry = () => {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const pageSchema = useMemo(() => {
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "What is Freemasonry (Preview)", url: "/what-is-freemasonry-preview" },
    ]);

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    };

    return [faqSchema, breadcrumb];
  }, []);

  const motionProps = (delay = 0) =>
    shouldReduceMotion
      ? { initial: false, animate: { opacity: 1, y: 0, x: 0 } }
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-50px" },
          transition: { duration: 0.5, delay },
        };

  const motionSlideProps = (delay = 0) =>
    shouldReduceMotion
      ? { initial: false, animate: { opacity: 1, x: 0 } }
      : {
          initial: { opacity: 0, x: -20 },
          whileInView: { opacity: 1, x: 0 },
          viewport: { once: true, margin: "-50px" },
          transition: { duration: 0.5, delay },
        };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Preview — What is Freemasonry?"
        description="Preview only."
        canonical="/what-is-freemasonry-preview"
        type="website"
        schema={pageSchema}
      />
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="What is Freemasonry?"
          subtitle="One of the oldest social and charitable organisations in the world"
        />

        <section className="py-20 md:py-28 bg-warm-white" aria-labelledby="intro-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div {...motionProps()}>
              <div className="h-0.5 w-16 bg-gold mb-6" aria-hidden="true" />
              <h2 id="intro-heading" className="text-2xl md:text-3xl font-serif text-foreground mb-6">
                A tradition built on brotherhood, charity, and self-improvement
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg mb-6">
                Freemasonry is one of the world's oldest social and charitable organisations, with roots stretching back to the traditions of the medieval stonemasons who built our great cathedrals and castles. In that era, travelling craftsmen used special grips, words and signs to prove their qualifications to fellow workers — a practice that lives on symbolically in Masonic ceremonies today, including at Weybridge Lodge No. 6787, our Freemasons Lodge here in Guildford, Surrey.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg mb-6">
                Modern Freemasonry uses these building analogies to teach its members how to lead more fulfilling lives and contribute positively to their communities. Just as stonemasons once wore aprons and gloves to shape rough stone, today's Freemasons meet not to build physical structures but to build lasting friendships, develop their character and support those around them.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg">
                The formation of the United Grand Lodge of England in 1717 marked a defining moment, but the traditions of the Craft reach much further into history. Today, around 175,000 Freemasons across England and Wales continue to uphold these time-honoured values — guided by four principles that are as relevant now as they have ever been.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-navy" aria-labelledby="principles-heading">
          <div className="container mx-auto px-6">
            <motion.div {...motionProps()} className="text-center mb-16">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2 id="principles-heading" className="text-3xl md:text-4xl font-serif text-gold">
                The Four Guiding Principles of Freemasonry
              </h2>
            </motion.div>

            <ul className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto list-none p-0">
              {principles.map((p, i) => {
                const Icon = p.icon;
                return (
                  <motion.li
                    key={p.title}
                    id={p.id}
                    {...motionProps(i * 0.1)}
                    className="p-8 rounded-sm border border-gold/10 bg-navy-light/30 scroll-mt-24"
                  >
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-gold/30 mb-5" aria-hidden="true">
                      <Icon className="w-6 h-6 text-gold" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-serif text-gold mb-1">{p.title}</h3>
                    <p className="text-gold text-sm font-sans mb-3">{p.subtitle}</p>
                    <p className="text-sm text-gold/70 font-sans leading-relaxed">{p.description}</p>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-warm-white" aria-labelledby="meeting-heading">
          <div className="container mx-auto px-6">
            <motion.div {...motionProps()} className="text-center mb-16">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2 id="meeting-heading" className="text-3xl md:text-4xl font-serif text-foreground">
                What Happens at a Masonic Lodge Meeting in Guildford?
              </h2>
            </motion.div>

            <ul className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto list-none p-0">
              {meetingParts.map((part, i) => {
                const Icon = part.icon;
                return (
                  <motion.li key={part.title} {...motionProps(i * 0.15)} className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-navy border border-gold/30 mb-6" aria-hidden="true">
                      <Icon className="w-7 h-7 text-gold" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-serif text-foreground mb-3">{part.title}</h3>
                    <p className="text-sm text-muted-foreground font-sans leading-relaxed">{part.description}</p>
                  </motion.li>
                );
              })}
            </ul>

            <motion.div {...motionProps(0.3)} className="text-center mt-14">
              <Link
                to="/lodge-traditions"
                className="inline-flex items-center gap-2 text-sm font-sans font-semibold text-gold uppercase tracking-widest hover:underline min-h-[48px] px-2"
              >
                Discover our Lodge traditions
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-navy" aria-labelledby="degrees-heading">
          <div className="container mx-auto px-6">
            <motion.div {...motionProps()} className="text-center mb-16">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2 id="degrees-heading" className="text-3xl md:text-4xl font-serif text-gold">
                The Three Degrees of Freemasonry
              </h2>
              <p className="text-gold/70 font-sans mt-4 max-w-2xl mx-auto">
                Every Freemason in Surrey and across the world progresses through the same three stages — each a ceremony rich in symbolism, moral teaching, and personal meaning.
              </p>
            </motion.div>

            <ul className="max-w-3xl mx-auto space-y-8 list-none p-0">
              {degrees.map((d, i) => (
                <motion.li key={d.degree} {...motionSlideProps(i * 0.15)} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-navy border border-gold/30 flex items-center justify-center" aria-hidden="true">
                    <span className="text-gold font-serif text-lg">{i + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-serif text-gold">{d.title}</h3>
                    <p className="text-gold/70 text-xs font-sans uppercase tracking-wide mb-2">{d.degree}</p>
                    <p className="text-sm text-gold/70 font-sans leading-relaxed">{d.description}</p>
                  </div>
                </motion.li>
              ))}
            </ul>

            <motion.div {...motionProps(0.3)} className="text-center mt-14">
              <Link
                to="/your-journey"
                className="inline-flex items-center gap-2 text-sm font-sans font-semibold text-gold uppercase tracking-widest hover:underline min-h-[48px] px-2"
              >
                <Compass className="w-4 h-4" aria-hidden="true" />
                See the Full Journey Timeline
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-warm-white border-t border-border" aria-labelledby="faq-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div {...motionProps()}>
              <div className="h-0.5 w-16 bg-gold mb-6" aria-hidden="true" />
              <h2 id="faq-heading" className="text-2xl md:text-3xl font-serif text-foreground mb-8">
                Frequently Asked Questions
              </h2>
              <ul className="list-none p-0 m-0 divide-y divide-border">
                {faqItems.map((f) => (
                  <li key={f.question} className="py-2">
                    <details className="group">
                      <summary className="flex items-center justify-between gap-4 cursor-pointer py-3 min-h-[48px] list-none font-serif text-lg text-foreground">
                        {f.question}
                        <span className="text-gold text-xl leading-none flex-shrink-0 transition-transform group-open:rotate-45" aria-hidden="true">
                          +
                        </span>
                      </summary>
                      <p className="text-muted-foreground font-sans leading-relaxed pb-4 pr-8">
                        {f.answer}
                      </p>
                    </details>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-warm-white" aria-labelledby="cta-heading">
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <motion.div {...motionProps()}>
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2 id="cta-heading" className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                Ready to find out if Freemasonry is right for you?
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg mb-8">
                Take our two-minute quiz for an honest picture of whether life at Weybridge Lodge No. 6787 — our Freemasons Lodge in Guildford, Surrey GU2 4DR — fits who you are. Or go straight to beginning your application.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
                <Link
                  to="/quiz"
                  className="inline-flex items-center justify-center gap-2 bg-gold text-navy px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Take the 2-Min Quiz
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/first-visit"
                  className="inline-flex items-center justify-center bg-navy text-gold border border-gold/30 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-navy-light transition-colors min-h-[48px] w-full sm:w-auto"
                >
                  Your Initiation Night
                </Link>
                <Link
                  to="/join-us"
                  className="inline-flex items-center justify-center bg-navy text-gold border border-gold/30 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-navy-light transition-colors min-h-[48px] w-full sm:w-auto"
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

export default WhatIsFreemasonryPreview;
