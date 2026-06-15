import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Compass, BookOpen, Crown, KeyRound, MessageCircle, Users, CheckSquare, Sun, Phone, FileText, Shield, Star, CalendarDays } from "lucide-react";

const degrees = [
  {
    stage: "Stage 1",
    title: "Initiation",
    subtitle: "Your first meeting as a member",
    when: "Usually within a few months of acceptance",
    icon: Compass,
    body: "The ceremony of Initiation is the moment you formally enter Freemasonry, receiving the First Degree of Entered Apprentice. You take a solemn obligation, are entrusted with certain signs of recognition, and are welcomed into the Lodge by your new brethren. Afterwards, you join the Festive Board — dinner, toasts and conversation — where lasting friendships begin.",
  },
  {
    stage: "Stage 2",
    title: "Passing",
    subtitle: "The Second Degree — Fellow Craft",
    when: "Typically 4–12 months after Initiation",
    icon: BookOpen,
    body: "Once you have had time to reflect on the First Degree, you are 'passed' to the Second Degree of Fellow Craft. A new ceremony reveals further layers of the Craft's symbolism, focusing on the pursuit of learning, intellectual curiosity and moral development. Your Mentor and the Director of Ceremonies will guide you when the moment is right.",
  },
  {
    stage: "Stage 3",
    title: "Raising",
    subtitle: "The Third Degree — Master Mason",
    when: "Typically 1–2 years after Initiation",
    icon: Crown,
    body: "The Third Degree — being 'raised' to Master Mason — is the most solemn and dramatic of the three ceremonies. It brings you to full membership of the Craft, with the right to visit other Lodges without restriction, take on more senior offices, and in time progress to the Chair of the Lodge as Worshipful Master. Many Freemasons describe it as one of the most profound experiences of their lives.",
  },
];

const joinSteps = [
  {
    n: "1",
    icon: Phone,
    title: "Initial Contact",
    body: "It starts with a simple phone call or email to our Membership Secretary. We'll answer your questions, tell you a bit about the Lodge, and suggest a time to meet in person. No pressure, no obligation — just a friendly conversation.",
  },
  {
    n: "2",
    icon: Users,
    title: "Informal Visit & Tour",
    body: "We'll invite you to the South West Surrey Masonic Centre for an informal look around. You'll meet a few of the brethren, see where we meet, and get a feel for who we are. It's relaxed, sociable, and a chance for you to ask anything that's on your mind.",
  },
  {
    n: "3",
    icon: FileText,
    title: "Application Form",
    body: "If you decide you'd like to proceed, we'll ask you to complete a straightforward application form. This is simply a formal record of your interest and a few basic details so we can begin the joining process.",
  },
  {
    n: "4",
    icon: MessageCircle,
    title: "Informal Interview",
    body: "A small committee of Lodge members will meet with you for a relaxed, informal chat. A few necessary questions will be asked — nothing personal or intrusive. It's simply to ensure Freemasonry is right for you, and that you're comfortable with us.",
  },
  {
    n: "5",
    icon: CheckSquare,
    title: "Ballot & Initiation Date",
    body: "Your application is put to a formal ballot in open Lodge. Freemasonry sets great store by the unanimous agreement of the members. Once accepted, we confirm your initiation date — your first visit as a member of Weybridge Lodge.",
  },
];

interface TimelineStep {
  title: string;
  duration?: string;
  description: string;
  icon: React.ReactNode;
}

const timelineData: TimelineStep[] = [
  {
    title: "1. Initial Enquiry & Casual Meet",
    duration: "1 – 3 months",
    description: "After submitting your interest online, a member of our committee will reach out for an informal chat over coffee or a drink. This is a relaxed, two-way conversation to answer your initial questions and get to know each other.",
    icon: <CalendarDays className="h-5 w-5 text-gold-dark" />,
  },
  {
    title: "2. The Committee Interview",
    duration: "1 evening",
    description: "You will be invited to the Guildford Masonic Centre to meet a small panel of our members. Do not let the word 'interview' worry you; it is simply a friendly discussion to ensure our values align and that your family commitments comfortably support joining.",
    icon: <Shield className="h-5 w-5 text-gold-dark" />,
  },
  {
    title: "3. The First Degree: Initiation",
    duration: "Your First Meeting",
    description: "The night you officially become a Freemason. You enter as a Candidate and leave as an Entered Apprentice. The traditional ceremony is solemn, deeply memorable, and focuses on the core principles of charity, integrity, and self-reflection.",
    icon: <BookOpen className="h-5 w-5 text-gold-dark" />,
  },
  {
    title: "4. The Second Degree: Passing",
    duration: "3 – 6 months later",
    description: "As a Fellowcraft Freemason, this stage symbolizes adulthood and the development of the mind. The ceremony focuses on the study of arts, sciences, and the importance of lifelong education and intellectual growth.",
    icon: <BookOpen className="h-5 w-5 text-gold-dark" />,
  },
  {
    title: "5. The Third Degree: Raising",
    duration: "3 – 6 months later",
    description: "The pinnacle of your initial journey. You are raised to the sublime degree of a Master Mason. This profound ceremony reflects on human nature, mortality, and the ultimate triumph of integrity and moral strength.",
    icon: <Star className="h-5 w-5 text-gold-dark" />,
  },
];

function JourneyTimelineSection() {
  return (
    <section className="bg-background py-16 px-4 sm:px-6 lg:px-8 border-t border-border">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-gold-dark font-semibold tracking-wide uppercase text-sm">Chronology</span>
          <h2 className="mt-2 text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl font-serif">
            Step-by-Step Progression
          </h2>
          <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
            From your first message to your installation as a Master Mason, here is the chronological path and estimated timing for your joining process.
          </p>
        </div>

        <div className="relative border-l border-border ml-4 md:ml-6 space-y-12">
          {timelineData.map((step, index) => (
            <div key={index} className="relative pl-8 sm:pl-10 group">
              <div className="absolute -left-[21px] top-0 bg-card border-2 border-border group-hover:border-gold-dark transition-colors p-2 rounded-full shadow-sm z-10">
                {step.icon}
              </div>

              <div className="bg-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h3 className="text-xl font-bold text-card-foreground tracking-tight font-serif">
                    {step.title}
                  </h3>
                  {step.duration && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold/10 text-gold-dark border border-gold-dark/20 whitespace-nowrap self-start sm:self-center">
                      {step.duration}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const YourJourney = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Your Masonic Journey | Degrees, Royal Arch & Joining Steps"
        description="Discover the journey through Freemasonry at Weybridge Lodge — the three Degrees (Initiation, Passing, Raising), the Royal Arch, the Lodge room layout, and the three steps to joining."
        canonical="/your-journey"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Your Masonic Journey", url: "/your-journey" },
        ])}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Your Masonic Journey"
          subtitle="From your first meeting to Master Mason — and beyond, into the Royal Arch"
        />

        {/* Intro */}
        <section className="py-12 sm:py-20 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                Three Degrees. One lifetime of friendship.
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed">
                Should you choose to pursue membership, your journey through Freemasonry unfolds in three formal stages, called Degrees. Each involves a ceremony rich in symbolism and allegory, through which the lessons of the Craft are presented over the course of one to three years — at your own pace, with the support of a Mentor every step of the way.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Three Degrees */}
        <section className="py-12 sm:py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl space-y-6">
            {degrees.map((d, i) => {
              const Icon = d.icon;
              return (
                <motion.article
                  key={d.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="bg-card border border-border rounded-sm p-6 sm:p-8 flex flex-col sm:flex-row gap-6"
                >
                  <div className="shrink-0">
                    <div className="w-14 h-14 rounded-full bg-navy text-gold-dark flex items-center justify-center border border-gold-dark/30">
                      <Icon className="w-6 h-6" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-gold-dark font-sans text-xs uppercase tracking-widest mb-1">{d.stage} · {d.when}</p>
                    <h3 className="text-2xl font-serif text-foreground mb-1">{d.title}</h3>
                    <p className="text-muted-foreground font-sans italic mb-3">{d.subtitle}</p>
                    <p className="text-muted-foreground font-sans text-sm leading-relaxed">{d.body}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        <JourneyTimelineSection />

        {/* Royal Arch */}
        <section className="py-12 sm:py-20 bg-navy-gradient">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-navy-light/30 border border-gold-dark/20 rounded-sm p-8 sm:p-10"
            >
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center border border-gold-dark/40 shrink-0">
                  <KeyRound className="w-6 h-6 text-gold-dark" />
                </div>
                <div>
                  <p className="text-gold-dark font-sans text-xs uppercase tracking-widest mb-2">The Fourth Step</p>
                  <h2 className="text-2xl md:text-3xl font-serif text-primary-foreground mb-4">The Holy Royal Arch</h2>
                  <p className="text-primary-foreground/70 font-sans leading-relaxed mb-3">
                    The Holy Royal Arch is considered the natural and essential completion of the Third Degree — described by the United Grand Lodge of England as the fourth and completing step of a Master Mason's journey.
                  </p>
                  <p className="text-primary-foreground/70 font-sans leading-relaxed">
                    It is <em>One Journey, One Organisation</em>. Joining a Royal Arch Chapter opens further ceremony, symbolism and fellowship — and is something many of our members go on to enjoy when the time feels right.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Lodge Room layout */}
        <section className="py-12 sm:py-20 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-10"
            >
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">The Lodge Room</h2>
              <p className="text-muted-foreground font-sans max-w-2xl mx-auto">
                Every Lodge room is laid out according to a design that carries deep symbolic meaning, modelled on the floor plan of King Solomon's Temple in Jerusalem.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-5">
              {[
                { dir: "East", title: "Worshipful Master", body: "The East represents the rising sun and the source of light and wisdom. The Master sits here, in the chair of highest honour." },
                { dir: "West", title: "Senior Warden", body: "The Senior Warden sits in the West and assists the Master in governing the Lodge." },
                { dir: "South", title: "Junior Warden", body: "The Junior Warden sits in the South and looks after the welfare of the brethren, particularly at refreshment." },
              ].map((p) => (
                <div key={p.dir} className="bg-card border border-border rounded-sm p-6 text-center">
                  <Sun className="w-6 h-6 text-gold-dark mx-auto mb-3" aria-hidden="true" />
                  <p className="text-gold-dark text-xs font-sans uppercase tracking-widest mb-1">{p.dir}</p>
                  <h3 className="font-serif text-foreground text-lg mb-2">{p.title}</h3>
                  <p className="text-muted-foreground font-sans text-sm leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>

            <p className="text-center text-muted-foreground font-sans text-sm mt-8 max-w-2xl mx-auto">
              Around the room sit the Deacons, Inner Guard, Tyler, Chaplain, Almoner, Secretary, Treasurer and Director of Ceremonies — each with a specific role and a symbolic tool of office. Together they manage every aspect of Lodge life, and each position represents a step on a path of personal development every member is invited to walk.
            </p>

            <div className="text-center mt-8">
              <Link
                to="/officers-jewels"
                className="inline-flex items-center justify-center border border-gold-dark text-gold-dark px-6 py-3 rounded-sm text-sm font-sans uppercase tracking-widest hover:bg-gold hover:text-accent-foreground transition-colors"
              >
                Explore the Officers' Jewels
              </Link>
            </div>
          </div>
        </section>

        {/* 3-step joining */}
        <section className="py-12 sm:py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">How To Join</h2>
              <p className="text-muted-foreground font-sans max-w-2xl mx-auto">
                Straightforward, unhurried and entirely on your own terms.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {joinSteps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.n}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="bg-card border border-border rounded-sm p-6 relative"
                  >
                    <p className="absolute top-4 right-4 text-5xl font-serif text-gold-dark/15 leading-none">{s.n}</p>
                    <Icon className="w-6 h-6 text-gold-dark mb-3" aria-hidden="true" />
                    <h3 className="font-serif text-foreground text-lg mb-2">{s.title}</h3>
                    <p className="text-muted-foreground font-sans text-sm leading-relaxed">{s.body}</p>
                  </motion.div>
                );
              })}
            </div>

            <p className="text-center text-muted-foreground font-sans italic mt-10 max-w-2xl mx-auto">
              "The journey of a thousand miles begins with a single step. Ours begins with a conversation."
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-navy">
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
            <h2 className="text-2xl md:text-3xl font-serif text-primary-foreground mb-4">
              Ready to start the conversation?
            </h2>
            <p className="text-primary-foreground/70 font-sans mb-8">
              We'd be delighted to hear from you. No paperwork, no pressure — just a friendly chat.
            </p>
            <Link
              to="/join-us"
              className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Enquire About Joining
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default YourJourney;
