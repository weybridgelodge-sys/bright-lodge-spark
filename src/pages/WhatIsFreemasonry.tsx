import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import { Shield, Users, Heart, HandHelping, Landmark, UtensilsCrossed, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

const principles = [
  {
    icon: Shield,
    title: "Integrity",
    subtitle: "Building good people",
    description: "Freemasons focus on building themselves as people of integrity, and membership provides the structure to help achieve that goal. Being a Freemason gives members a sense of purpose, supporting and guiding them on their journey through life.",
  },
  {
    icon: Users,
    title: "Friendship",
    subtitle: "Building together",
    description: "Freemasonry provides the common foundation for friendships between members, many of which will last for life. All members share a sense of togetherness that strengthens their ability to succeed and grow.",
  },
  {
    icon: Heart,
    title: "Respect",
    subtitle: "Building unity",
    description: "Freemasonry brings people together irrespective of their race, religion, or other perceived differences. Members are expected to be of high moral standing and are encouraged to talk openly about the organisation.",
  },
  {
    icon: HandHelping,
    title: "Service",
    subtitle: "Service focus",
    description: "Whether participating in events, fundraising for a charitable cause or volunteering, service is at the very heart of Freemasonry. Our members make valuable contributions by donating time, resources and skills.",
  },
];

const meetingParts = [
  {
    icon: Landmark,
    title: "The Lodge",
    description: "Freemasonry is organised in smaller units of members, called Lodges. Weybridge Lodge No. 6787 falls within the Province of Surrey. Once you start to progress through Freemasonry you are able to visit other Lodges where you meet and get to know more Freemasons.",
  },
  {
    icon: GraduationCap,
    title: "The Meeting",
    description: "We hold Lodge meetings within our Temple and typically follow two parts. The first involves administrative procedures following an agenda. The second part focuses on our more ceremonial function, such as the admittance of new members or the installation of the Master.",
  },
  {
    icon: UtensilsCrossed,
    title: "The Social",
    description: "Once the meeting is concluded, we retire from the Temple and enjoy the social aspect over drinks before a sit-down three-course meal — the 'Festive Board'. We raise glasses for toasts, give and receive speeches, and reflect on the evening.",
  },
];

const degrees = [
  { degree: "First Degree", title: "Entered Apprentice", description: "This ceremony reminds us that all are equal — it is the responsibility of those that do well to look after those less fortunate." },
  { degree: "Second Degree", title: "Fellowcraft Freemason", description: "This encourages members to better themselves through education and focuses on self-development." },
  { degree: "Third Degree", title: "Master Mason", description: "This ceremony teaches how to use your life wisely and be remembered for the right reasons." },
];

const WhatIsFreemasonry = () => {
  return (
    <div className="min-h-screen">
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
                Freemasonry as we know it is one of the oldest social and charitable organisations in the world. Its roots lie in the traditions of the medieval stonemasons who built our ancient monuments such as cathedrals and castles.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg">
                These building analogies are used to teach ourselves how to lead a better and more fulfilling life that benefits the communities in which we live. In today's society, Freemasonry is about meeting like-minded people, building friendships and enhancing our communities.
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
