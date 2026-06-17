import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Shield, Users, Heart, HandHelping, Landmark, UtensilsCrossed, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

const principles = [
  {
    icon: Shield,
    title: "Integrity",
    subtitle: "Building good people",
    description: "Honesty, trustworthiness and conscientiousness form the bedrock of a Freemason's character. Members are encouraged to act with honour in every aspect of their lives — at home, at work and in their communities. Freemasonry provides a framework of moral teachings that helps each individual hold themselves to the highest standards of conduct, fostering trust and strong principles that extend well beyond the Lodge room.",
  },
  {
    icon: Users,
    title: "Friendship",
    subtitle: "Building together",
    description: "Freemasonry opens the door to a remarkably wide circle of friends who share common values and interests. From the moment a new member joins, they discover a genuine sense of belonging and togetherness that often lasts a lifetime. These bonds cross social, professional and cultural boundaries, creating a supportive network where members celebrate each other's successes and stand alongside one another through life's challenges.",
  },
  {
    icon: Heart,
    title: "Respect",
    subtitle: "Building unity",
    description: "Since its earliest days, Freemasonry has championed an environment where diversity is genuinely valued. Members come from every walk of life, faith and background, and the organisation actively promotes inclusivity, tolerance and open dialogue. Freemasons are encouraged to look beyond perceived differences, creating a space where mutual respect is not simply expected but practised in every interaction.",
  },
  {
    icon: HandHelping,
    title: "Service",
    subtitle: "Building communities",
    description: "Charitable service sits at the very heart of what it means to be a Freemason. Whether organising fundraising events, volunteering in local communities or supporting national causes, members make meaningful contributions by giving their time, resources and skills. Across England and Wales alone, Freemasons donate millions of pounds each year to causes that make a tangible difference to people's lives.",
  },
];

const meetingParts = [
  {
    icon: Landmark,
    title: "The Lodge",
    description: "Freemasonry is organised into smaller units called Lodges, each with its own unique character and history. Weybridge Lodge No. 6787 sits within the Province of Surrey. Every member is free to choose the Lodge they wish to join, and as they progress they are warmly welcomed to visit other Lodges — an excellent way to broaden friendships and experience the rich variety within the Craft.",
  },
  {
    icon: GraduationCap,
    title: "The Meeting",
    description: "Lodge meetings typically unfold in two parts. The first covers administrative business such as proposing new members, balloting and receiving updates on charitable activities. The second part is ceremonial — this might involve the admittance of a new member, the advancement of an existing one through the degrees, or the installation of the Master of the Lodge and his officers for the coming year.",
  },
  {
    icon: UtensilsCrossed,
    title: "The Social",
    description: "True to the spirit of friendship and togetherness, every meeting concludes with a social gathering. At Weybridge Lodge, members retire from the Temple to enjoy drinks before sitting down to a three-course meal known as the 'Festive Board'. Toasts are raised, speeches are given, and the evening provides a relaxed setting to strengthen bonds and reflect on shared experiences.",
  },
];

const degrees = [
  { degree: "First Degree", title: "Entered Apprentice", description: "The journey begins here. This ceremony introduces the candidate to Freemasonry's core values and reminds us of a fundamental truth — that all people are equal, and those who prosper carry a responsibility to support those less fortunate. The new member is received into the Lodge and begins to learn the symbolic language of the Craft." },
  { degree: "Second Degree", title: "Fellowcraft Freemason", description: "The second stage encourages members to deepen their understanding through learning and self-improvement. It emphasises the importance of education, intellectual curiosity and personal growth — urging each Freemason to develop their talents and apply them for the benefit of others." },
  { degree: "Third Degree", title: "Master Mason", description: "The final degree is the most solemn and meaningful. It teaches members to reflect on how they use their time and to live in a way that leaves a positive legacy. Upon completion, the member becomes a Master Mason — the foundation upon which all further Masonic involvement is built." },
];

const WhatIsFreemasonry = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="What is Freemasonry?"
        description="Discover what Freemasonry is — its principles of integrity, friendship, respect and service. Learn about Masonic meetings, the three degrees, and how to join in Guildford, Surrey."
        canonical="/what-is-freemasonry"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "What is Freemasonry", url: "/what-is-freemasonry" },
        ])}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="What is Freemasonry?"
          subtitle="One of the oldest social and charitable organisations in the world"
        />

        {/* Intro */}
        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-muted-foreground font-sans leading-relaxed text-lg mb-6">
                Freemasonry is one of the world's oldest social and charitable organisations, with roots stretching back to the traditions of the medieval stonemasons who built our great cathedrals and castles. In that era, travelling craftsmen used special grips, words and signs to prove their qualifications to fellow workers — a practice that lives on symbolically in Masonic ceremonies today.
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

        {/* Guiding Principles */}
        <section className="py-20 md:py-28 bg-navy-gradient">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-primary-foreground">The Four Guiding Principles</h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {principles.map((p, i) => (
                <motion.div
                  key={p.title}
                  id={p.title.toLowerCase()}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="p-8 rounded-sm border border-gold/10 bg-navy-light/30 scroll-mt-24"
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-gold/30 mb-5">
                    <p.icon className="w-6 h-6 text-gold" />
                  </div>
                  <h3 className="text-xl font-serif text-primary-foreground mb-1">{p.title}</h3>
                  <p className="text-gold text-sm font-sans mb-3">{p.subtitle}</p>
                  <p className="text-sm text-primary-foreground/60 font-sans leading-relaxed">{p.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* What happens at a meeting */}
        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground">What Happens at a Lodge Meeting?</h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {meetingParts.map((part, i) => (
                <motion.div
                  key={part.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-navy mb-6">
                    <part.icon className="w-7 h-7 text-gold" />
                  </div>
                  <h3 className="text-xl font-serif text-foreground mb-3">{part.title}</h3>
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed">{part.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* The Three Degrees */}
        <section className="py-20 md:py-28 bg-navy-gradient">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-primary-foreground">The Three Degrees</h2>
            </motion.div>

            <div className="max-w-3xl mx-auto space-y-8">
              {degrees.map((d, i) => (
                <motion.div
                  key={d.degree}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  className="flex gap-6 items-start"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="text-gold font-serif text-lg font-bold">{i + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-serif text-primary-foreground">{d.title}</h3>
                    <p className="text-gold text-xs font-sans uppercase tracking-wide mb-2">{d.degree}</p>
                    <p className="text-sm text-primary-foreground/60 font-sans leading-relaxed">{d.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-16">
              <Link
                to="/join-us"
                className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Join Weybridge Lodge
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default WhatIsFreemasonry;
