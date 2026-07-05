import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Compass, BookOpen, Crown, KeyRound,
  MessageCircle, Users, CheckSquare,
  Phone, FileText, Star, CalendarDays,
  Shield, ArrowRight,
  type LucideIcon,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface JoinStep {
  n: string;
  icon: LucideIcon;
  title: string;
  body: string;
}

interface Degree {
  stage: string;
  title: string;
  subtitle: string;
  when: string;
  icon: LucideIcon;
  body: string;
}

interface TimelineStep {
  title: string;
  duration?: string;
  description: string;
  icon: LucideIcon;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const joinSteps: JoinStep[] = [
  {
    n: "1",
    icon: Phone,
    title: "Initial Contact",
    body: "It starts with a simple phone call or email to our Membership Secretary. We will answer your questions, tell you about the Lodge, and suggest a time to meet. No pressure, no obligation — just a friendly conversation.",
  },
  {
    n: "2",
    icon: Users,
    title: "Informal Visit & Tour",
    body: "We will invite you to the Guildford Masonic Centre, GU2 4DR, for a relaxed look around. You will meet a few of the brethren, see where we meet, and get a feel for who we are — entirely at your own pace.",
  },
  {
    n: "3",
    icon: FileText,
    title: "Application Form",
    body: "If you decide to proceed, we will ask you to complete a straightforward application form — a formal record of your interest and basic details to begin the joining process at Weybridge Lodge No. 6787.",
  },
  {
    n: "4",
    icon: MessageCircle,
    title: "Informal Interview",
    body: "A small committee of Lodge members will meet you for a relaxed, informal chat. A few necessary questions will be asked — nothing personal or intrusive. It exists simply to ensure Freemasonry is right for you.",
  },
  {
    n: "5",
    icon: CheckSquare,
    title: "Interview & Confirmation",
    body: "If the committee interview goes well, we will confirm your initiation date at that point. There is no waiting in the dark — a successful interview means you have a date in the diary.",
  },
  {
    n: "6",
    icon: FileText,
    title: "Read in Open Lodge",
    body: "At the meeting before your initiation, your name and details are formally read aloud in open Lodge. This is a procedural step required by the United Grand Lodge of England — the brethren are formally notified of your candidature ahead of the ceremony.",
  },
  {
    n: "7",
    icon: Shield,
    title: "The Ballot & Your Initiation",
    body: "On the night of your initiation, a formal ballot is taken in the Lodge room before you are admitted. Once the ballot confirms unanimous acceptance, the ceremony proceeds and your journey as a Freemason begins.",
  },
];

const timelineData: TimelineStep[] = [
  {
    title: "Initial Enquiry & Casual Meet",
    duration: "1 – 3 months",
    description: "After submitting your interest, a member of our committee will reach out for an informal chat over coffee or a drink at the Guildford Masonic Centre. A relaxed, two-way conversation to answer your questions and get to know each other.",
    icon: CalendarDays,
  },
  {
    title: "The Committee Interview",
    duration: "1 evening",
    description: "You will be invited to meet a small panel of our members at Weybourne House, Hitherbury Close, Guildford, GU2 4DR. Do not let the word 'interview' concern you — it is a friendly discussion to ensure our values align and that your commitments comfortably support joining.",
    icon: Shield,
  },
  {
    title: "The First Degree: Initiation",
    duration: "Your First Meeting",
    description: "The night you officially become a Freemason. You enter as a Candidate and leave as an Entered Apprentice. The ceremony is solemn, deeply memorable, and focused on the core principles of charity, integrity, and self-reflection.",
    icon: Compass,
  },
  {
    title: "The Second Degree: Passing",
    duration: "3 – 6 months later",
    description: "As a Fellow Craft Freemason, this stage symbolises the development of the mind — focusing on the pursuit of learning, the arts and sciences, and the importance of intellectual growth.",
    icon: BookOpen,
  },
  {
    title: "The Third Degree: Raising",
    duration: "3 – 6 months later",
    description: "The pinnacle of your initial journey. You are raised to the sublime degree of Master Mason — a profound ceremony reflecting on human nature, integrity, and moral strength. From here, the whole of the Craft opens to you.",
    icon: Star,
  },
];

const degrees: Degree[] = [
  {
    stage: "First Degree",
    title: "Initiation — Entered Apprentice",
    subtitle: "Your first meeting as a member",
    when: "Usually within a few months of acceptance",
    icon: Compass,
    body: "The ceremony of Initiation is the moment you formally enter Freemasonry. You take a solemn obligation, are entrusted with certain signs of recognition, and are welcomed into the Lodge. Afterwards, you join the Festive Board — dinner, toasts and conversation — where lasting friendships begin at our Masonic Lodge in Guildford.",
  },
  {
    stage: "Second Degree",
    title: "Passing — Fellow Craft",
    subtitle: "The pursuit of knowledge and moral growth",
    when: "Typically 4–12 months after Initiation",
    icon: BookOpen,
    body: "Once you have had time to reflect on the First Degree, you are passed to the Second. A new ceremony reveals further layers of the Craft's symbolism — focusing on intellectual curiosity and moral development. Your Mentor and the Director of Ceremonies will guide you at the right moment.",
  },
  {
    stage: "Third Degree",
    title: "Raising — Master Mason",
    subtitle: "Full membership of the Craft",
    when: "Typically 1–2 years after Initiation",
    icon: Crown,
    body: "The most solemn and dramatic of the three ceremonies, being raised to Master Mason brings full membership of the Craft. You gain the right to visit other Lodges, take senior offices, and in time progress to the Chair of the Lodge as Worshipful Master. Many Freemasons in Surrey describe it as one of the most profound experiences of their lives.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
const YourJourney = () => {
  const shouldReduceMotion = useReducedMotion();

  const pageSchema = useMemo(() => {
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "How to Join", url: "/your-journey" },
    ]);

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://www.weybridgelodge.org.uk/your-journey#webpage",
        url: "https://www.weybridgelodge.org.uk/your-journey",
        name: "How to Join the Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "The complete application process for joining Weybridge Lodge No. 6787 — a Freemasons Lodge in Guildford, Surrey. From your first enquiry to your initiation night at the Guildford Masonic Centre, GU2 4DR.",
        inLanguage: "en-GB",
        isPartOf: {
          "@id": "https://www.weybridgelodge.org.uk/#website",
        },
      },
      breadcrumb,
    ];
  }, []);

  const motionProps = (delay: number = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true },
          transition: { duration: 0.5, delay },
        };

  return (
    <div className="min-h-screen">
      <SEO
        title="How to Join the Freemasons in Guildford, Surrey"
        description="The complete application process for joining Weybridge Lodge No. 6787 — a Freemasons Lodge in Guildford, Surrey. From first enquiry to initiation night at the Guildford Masonic Centre, GU2 4DR."
        canonical="/your-journey"
        schema={pageSchema}
      />

      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Header />

      <main id="main-content">
        {/* ── H1 — conversion-focused, geo-anchored ── */}
        <PageHeader
          title="How to Join the Freemasons in Guildford, Surrey"
          subtitle="The application process at Weybridge Lodge No. 6787 — straightforward, unhurried, entirely on your terms"
        />

        {/* ── Intro ── */}
        <section className="py-12 sm:py-20 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
            <motion.div {...motionProps()}>
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                Straightforward, unhurried, and entirely on your terms
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed">
                Joining a Masonic Lodge in Surrey does not require connections, credentials, or
                certainty. It requires only genuine curiosity and a willingness to have a
                conversation. Below is every step of the process at Weybridge Lodge No. 6787 —
                nothing hidden, nothing rushed.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Five Join Steps ── */}
        <section className="py-12 sm:py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <motion.div {...motionProps()} className="text-center mb-12">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                The Application Process
              </h2>
              <p className="text-muted-foreground font-sans max-w-2xl mx-auto">
                From first contact to initiation night at the Guildford Masonic Centre — here is
                exactly what to expect at each stage.
              </p>
            </motion.div>

            <div className="flex flex-col items-center gap-0">
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 list-none p-0 m-0 w-full">
                {joinSteps.slice(0, 4).map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.li
                      key={s.n}
                      {...motionProps(i * 0.08)}
                      className="bg-background border border-border rounded-sm p-6 relative"
                    >
                      <p className="absolute top-4 right-4 text-5xl font-serif text-gold/10 leading-none" aria-hidden="true">{s.n}</p>
                      <div className="w-10 h-10 rounded-full bg-navy text-gold flex items-center justify-center border border-gold/30 mb-4" aria-hidden="true">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-serif text-foreground text-lg mb-2">{s.title}</h3>
                      <p className="text-muted-foreground font-sans text-sm leading-relaxed">{s.body}</p>
                    </motion.li>
                  );
                })}
              </ul>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 list-none p-0 m-0 w-full lg:w-3/4 xl:w-2/3 mt-5">
                {joinSteps.slice(4).map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.li
                      key={s.n}
                      {...motionProps((i + 4) * 0.08)}
                      className="bg-background border border-border rounded-sm p-6 relative"
                    >
                      <p className="absolute top-4 right-4 text-5xl font-serif text-gold/10 leading-none" aria-hidden="true">{s.n}</p>
                      <div className="w-10 h-10 rounded-full bg-navy text-gold flex items-center justify-center border border-gold/30 mb-4" aria-hidden="true">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-serif text-foreground text-lg mb-2">{s.title}</h3>
                      <p className="text-muted-foreground font-sans text-sm leading-relaxed">{s.body}</p>
                    </motion.li>
                  );
                })}
              </ul>
            </div>

            <p className="text-center text-muted-foreground font-sans italic mt-10 max-w-2xl mx-auto">
              "The journey of a thousand miles begins with a single step. Ours begins with a conversation."
            </p>
          </div>
        </section>

        {/* ── Journey Timeline ── */}
        <section className="bg-warm-white py-16 px-4 sm:px-6 lg:px-8 border-t border-border">
          <div className="max-w-3xl mx-auto">
            <motion.div {...motionProps()} className="text-center mb-12">
              <span className="text-gold font-semibold tracking-wide uppercase text-sm">
                Chronology
              </span>
              <h2 className="mt-2 text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl font-serif">
                Step-by-Step Progression
              </h2>
              <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
                From your first message to Master Mason — the chronological path and estimated
                timing for joining Weybridge Lodge No. 6787, our Masonic Lodge in Surrey.
              </p>
            </motion.div>

            <ol className="relative border-l border-border ml-4 md:ml-6 space-y-12 list-none p-0">
              {timelineData.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.li
                    key={step.title}
                    {...motionProps(i * 0.06)}
                    className="relative pl-8 sm:pl-10 group"
                  >
                    <div className="absolute -left-[21px] top-0 bg-navy text-gold border-2 border-border group-hover:border-gold transition-colors p-2 rounded-full z-10">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>

                    <div className="bg-card p-6 rounded-sm border border-border">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <h3 className="text-xl font-bold text-card-foreground tracking-tight font-serif">
                          {i + 1}. {step.title}
                        </h3>
                        {step.duration && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-navy text-gold whitespace-nowrap self-start sm:self-center">
                            {step.duration}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ── Three Degrees — post-join motivator ── */}
        <section className="py-12 sm:py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <motion.div {...motionProps()} className="text-center mb-12">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                What your membership journey looks like
              </h2>
              <p className="text-muted-foreground font-sans max-w-2xl mx-auto">
                Once accepted, your journey through the three Degrees of Freemasonry unfolds at
                your own pace — supported by a dedicated Mentor at every stage.
              </p>
            </motion.div>

            <ul className="space-y-6 list-none p-0">
              {degrees.map((d, i) => {
                const Icon = d.icon;
                return (
                  <motion.li
                    key={d.title}
                    {...motionProps(i * 0.08)}
                    className="bg-card border border-border rounded-sm p-6 sm:p-8 flex flex-col sm:flex-row gap-6"
                  >
                    <div className="shrink-0">
                      <div className="w-14 h-14 rounded-full bg-navy text-gold flex items-center justify-center border border-gold/40">
                        <Icon className="w-6 h-6" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-gold font-sans text-xs uppercase tracking-widest mb-1">
                        {d.stage} · {d.when}
                      </p>
                      <h3 className="text-2xl font-serif text-foreground mb-1">{d.title}</h3>
                      <p className="text-muted-foreground font-sans italic mb-3">{d.subtitle}</p>
                      <p className="text-muted-foreground font-sans text-sm leading-relaxed">
                        {d.body}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ── Royal Arch Teaser ── */}
        <section className="py-12 sm:py-20 bg-navy">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <motion.div
              {...motionProps()}
              className="border border-gold/20 rounded-sm p-8 sm:p-10"
            >
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-14 h-14 rounded-full bg-navy text-gold flex items-center justify-center border border-gold/40 shrink-0">
                  <KeyRound className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-gold font-sans text-xs uppercase tracking-widest mb-2">
                    Beyond the Third Degree
                  </p>
                  <h2 className="text-2xl md:text-3xl font-serif text-primary-foreground mb-4">
                    The Holy Royal Arch
                  </h2>
                  <p className="text-primary-foreground/70 font-sans leading-relaxed mb-3">
                    The Holy Royal Arch is described by the United Grand Lodge of England as the
                    natural and essential completion of the Third Degree — the fourth and
                    completing step of a Master Mason's journey.
                  </p>
                  <p className="text-primary-foreground/70 font-sans leading-relaxed">
                    Joining a Royal Arch Chapter opens further ceremony, symbolism and fellowship.
                    Many members of our Freemasons Lodge in Guildford go on to enjoy it when the
                    time feels right — there is no rush and no expectation.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-16 bg-navy">
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
            <motion.div {...motionProps()}>
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-2xl md:text-3xl font-serif text-primary-foreground mb-4">
                Ready to start the conversation?
              </h2>
              <p className="text-primary-foreground/70 font-sans mb-8">
                We would be delighted to hear from you. No paperwork, no pressure — just a friendly
                chat about joining our Masonic Lodge in Surrey.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/join-us"
                  aria-label="Begin your application to join Weybridge Lodge No. 6787 in Guildford"
                  className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  Begin Your Application
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Link>
                <Link
                  to="/quiz"
                  className="inline-flex items-center justify-center border border-gold text-gold px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-gold hover:text-navy transition-colors"
                >
                  Take the 2-Min Quiz
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

export default YourJourney;
