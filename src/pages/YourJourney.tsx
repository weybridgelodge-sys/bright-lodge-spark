import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Compass, BookOpen, Crown, KeyRound, MessageCircle, Users, CheckSquare, Sun } from "lucide-react";

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
    body: "The Third Degree — being 'raised' to Master Mason — is the most solemn and dramatic of the three ceremonies. It brings you to full membership of the Craft, with the right to visit other Lodges, take on offices, and in time progress to the Chair of the Lodge as Worshipful Master. Many Freemasons describe it as one of the most profound experiences of their lives.",
  },
];

const joinSteps = [
  {
    n: "1",
    icon: MessageCircle,
    title: "Express Your Interest",
    body: "Speak to whoever brought you here, or contact our Secretary directly through the Join Us page. There is no formal paperwork at this stage — simply a conversation. You are welcome to ask as many questions as you like before taking any further step.",
  },
  {
    n: "2",
    icon: Users,
    title: "Meet the Members",
    body: "You will be invited to an informal meeting with a small committee of Lodge members. It is not an interview in any daunting sense — simply an opportunity for you to get to know a few of the brethren, and for them to get to know you. Relaxed, friendly, usually over a cup of tea or a drink.",
  },
  {
    n: "3",
    icon: CheckSquare,
    title: "The Ballot",
    body: "If you wish to proceed, your application is put to a formal ballot in open Lodge. Freemasonry sets great store by the unanimous agreement of the members, so this step ensures every brother is content to welcome you. If successful, your Initiation is arranged at a convenient meeting.",
  },
];

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
                    <div className="w-14 h-14 rounded-full bg-navy text-gold flex items-center justify-center border border-gold/30">
                      <Icon className="w-6 h-6" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-gold font-sans text-xs uppercase tracking-widest mb-1">{d.stage} · {d.when}</p>
                    <h3 className="text-2xl font-serif text-foreground mb-1">{d.title}</h3>
                    <p className="text-muted-foreground font-sans italic mb-3">{d.subtitle}</p>
                    <p className="text-muted-foreground font-sans text-sm leading-relaxed">{d.body}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        {/* Royal Arch */}
        <section className="py-12 sm:py-20 bg-navy-gradient">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-navy-light/30 border border-gold/20 rounded-sm p-8 sm:p-10"
            >
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center border border-gold/40 shrink-0">
                  <KeyRound className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="text-gold font-sans text-xs uppercase tracking-widest mb-2">The Fourth Step</p>
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
                  <Sun className="w-6 h-6 text-gold mx-auto mb-3" aria-hidden="true" />
                  <p className="text-gold text-xs font-sans uppercase tracking-widest mb-1">{p.dir}</p>
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
                className="inline-flex items-center justify-center border border-gold text-gold px-6 py-3 rounded-sm text-sm font-sans uppercase tracking-widest hover:bg-gold hover:text-accent-foreground transition-colors"
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
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">How To Join — In Three Steps</h2>
              <p className="text-muted-foreground font-sans max-w-2xl mx-auto">
                Straightforward, unhurried and entirely on your own terms.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-5">
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
                    <p className="absolute top-4 right-4 text-5xl font-serif text-gold/15 leading-none">{s.n}</p>
                    <Icon className="w-6 h-6 text-gold mb-3" aria-hidden="true" />
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
