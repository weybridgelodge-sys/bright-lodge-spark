import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Shirt, UserCheck, BookOpen, ArrowRight, Users, DoorOpen, Sparkles, Utensils, Moon, UtensilsCrossed } from "lucide-react";

interface TimelineStep {
  icon: React.ElementType;
  time: string;
  title: string;
  body: string;
}

interface InfoCard {
  icon: React.ElementType;
  title: string;
  body: string;
}

const timeline: TimelineStep[] = [
  {
    icon: Users,
    time: "Before the night",
    title: "Everything that leads here",
    body: "By the time you reach your initiation night, we've already spoken on the phone, exchanged emails, shown you around the Masonic Centre, and met for a relaxed informal interview. You've completed your application form and your ballot has been successful. Now all that remains is the evening itself.",
  },
  {
    icon: DoorOpen,
    time: "Arrival & greeting",
    title: "Arrival & greeting",
    body: "You'll arrive at the Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford, GU2 4DR, and be greeted warmly by your Proposer and the Director of Ceremonies. There'll be time to settle in, meet a few familiar faces, and calm any nerves. On-site parking is available, and the centre is around a 10-minute walk or a 3-minute taxi ride from Guildford station.",
  },
  {
    icon: Sparkles,
    time: "The ceremony of Initiation",
    title: "The ceremony of Initiation",
    body: "You'll be escorted into the Lodge room and prepared for the ceremony. You don't need to memorise anything, and you won't be left alone for a single moment — your Proposer is with you throughout. The initiation is a time-honoured ceremony rich in symbolism: think of it as a short allegorical journey from darkness into light, marking the beginning of your Masonic life.",
  },
  {
    icon: Utensils,
    time: "The Festive Board",
    title: "The Festive Board",
    body: "After the ceremony, everyone retires to the dining room for a celebratory three-course meal. This is where the real celebration happens — your new brethren will want to congratulate you, welcome you properly, and hear your first impressions.",
  },
  {
    icon: Moon,
    time: "Home as a Freemason",
    title: "Home as a Freemason",
    body: "You leave with new friends, a new title — Entered Apprentice — and the start of a journey that lasts a lifetime. Or stay for a few drinks with your new lodge mates — the bar stays open for those who want to linger.",
  },
];

const practicalCards: InfoCard[] = [
  {
    icon: Shirt,
    title: "What to Wear",
    body: "For your initiation ceremony, wear a dark lounge suit, white shirt, and dark tie. White gloves are provided for you on the night — you do not need to bring your own.",
  },
  {
    icon: MapPin,
    title: "Where We Meet",
    body: "Your initiation takes place at the Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford, GU2 4DR. On-site parking is available, and the centre is around a 10-minute walk or a 3-minute taxi ride from Guildford station.",
  },
  {
    icon: UserCheck,
    title: "Who Will Be There",
    body: "Your Proposer — the member who put your name forward — will be present, along with the Lodge Mentor, whose specific role is to support new candidates. You will not be handed around strangers.",
  },
  {
    icon: UtensilsCrossed,
    title: "Dietary Needs",
    body: "Just let us know in advance — vegetarian, vegan, gluten-free, allergies. All easily handled.",
  },
];

const FirstVisit = () => {
  const pageSchema = useMemo(() => {
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Your Initiation Night", url: "/first-visit" },
    ]);

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://weybridgelodge.org.uk/first-visit#webpage",
        url: "https://weybridgelodge.org.uk/first-visit",
        name: "Your Initiation Night | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "A candid, reassuring guide to your Masonic initiation night at Weybridge Lodge No. 6787 — what happens, what to wear, and what to expect at the Guildford Masonic Centre, GU2 4DR.",
        inLanguage: "en-GB",
        isPartOf: {
          "@id": "https://weybridgelodge.org.uk/#website",
        },
      },
      breadcrumb,
    ];
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Your Initiation Night"
        description="A candid, reassuring guide to your Masonic initiation night at Weybridge Lodge No. 6787 — what happens, what to wear, and what to expect at the Guildford Masonic Centre, GU2 4DR."
        canonical="/first-visit"
        schema={pageSchema}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Your Initiation Night"
          subtitle="A candid, reassuring guide to your first evening as a Freemason at the Guildford Masonic Centre"
        />

        <section className="bg-background py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">

            {/* Intro */}
            <section aria-labelledby="intro-heading" className="text-center mb-16">
              <span className="text-gold font-sans font-semibold tracking-widest uppercase text-xs">
                Your Evening
              </span>
              <h2 id="intro-heading" className="font-serif mt-3 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                Every Mason in that room has stood where you are standing
              </h2>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Your initiation night is one of the most memorable evenings you will have as a
                Freemason — but right now, it is simply unknown. That is entirely normal, and it is
                exactly what this page is here to address. There are no surprises designed to unsettle
                you. Every brother present was initiated himself, remembers the feeling, and will be
                genuinely glad to see you walk through that door.
              </p>
            </section>

            {/* Timeline of the Evening */}
            <section aria-labelledby="timeline-heading" className="mb-12">
              <h2 id="timeline-heading" className="sr-only">
                Timeline of your initiation night at Weybridge Lodge, Guildford
              </h2>
              <div className="relative">
                <div className="absolute left-6 top-2 bottom-2 w-px bg-gold/30 hidden sm:block" />
                <ul className="space-y-10">
                  {timeline.map((step, idx) => {
                    const Icon = step.icon;
                    return (
                      <motion.li
                        key={step.title}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                        className="relative flex gap-5 sm:gap-8"
                      >
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-full bg-navy text-gold-dark flex items-center justify-center border border-gold-dark/40 shadow-md">
                            <Icon className="w-5 h-5" aria-hidden="true" />
                          </div>
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-gold-dark font-sans text-xs uppercase tracking-widest mb-1">{step.time}</p>
                          <h3 className="text-xl font-serif text-foreground mb-2">{step.title}</h3>
                          <p className="text-muted-foreground font-sans text-sm leading-relaxed">{step.body}</p>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>
            </section>

            {/* Practical Cards Grid */}
            <section aria-labelledby="practical-heading" className="mb-12">
              <h2 id="practical-heading" className="sr-only">
                Practical information for your initiation night at Weybridge Lodge, Guildford
              </h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 list-none p-0">
                {practicalCards.map(({ icon: Icon, title, body }) => (
                  <li
                    key={title}
                    className="bg-card p-6 rounded-sm border border-border flex gap-4"
                  >
                    <div className="p-3 bg-navy rounded-sm h-fit text-gold shrink-0">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-bold text-card-foreground mb-1">
                        {title}
                      </h3>
                      <p className="text-muted-foreground font-sans text-sm leading-relaxed">
                        {body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Ceremony & Festive Board Narrative */}
            <section
              aria-labelledby="ceremony-heading"
              className="bg-card p-8 rounded-sm border border-border mb-12"
            >
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="h-5 w-5 text-gold" aria-hidden="true" />
                <h2 id="ceremony-heading" className="font-serif text-2xl font-bold text-card-foreground">
                  What happens during the evening
                </h2>
              </div>

              <div className="space-y-8 text-muted-foreground font-sans text-sm sm:text-base leading-relaxed">

                {/* The Ceremony */}
                <div>
                  <h3 className="font-serif text-lg font-bold text-card-foreground mb-3">
                    The Initiation Ceremony
                  </h3>
                  <p className="mb-3">
                    The initiation ceremony is the formal opening of your journey as a Freemason and
                    your entry into the First Degree — the Entered Apprentice. It takes place in the
                    Lodge room, with the Lodge opened and the brethren assembled in their places.
                  </p>
                  <p className="mb-3">
                    The ceremony itself is conducted with care and dignity. You will be guided through
                    every step by the brethren present — nothing is sprung on you without direction.
                    The obligations you take are moral in nature: commitments to integrity, to
                    brotherhood, and to charitable behaviour. They ask nothing of you that conflicts
                    with your duties to your family, your faith, or the law.
                  </p>
                  <p>
                    Certain elements of the ceremony are traditional and kept within the Lodge — this
                    is not secrecy for its own sake, but the preservation of an experience that has
                    meaning precisely because it is encountered rather than previewed. What we can say
                    is this: candidates consistently describe the evening as moving, memorable, and
                    far less daunting than they anticipated.
                  </p>
                </div>

                {/* The Festive Board */}
                <div>
                  <h3 className="font-serif text-lg font-bold text-card-foreground mb-3">
                    The Festive Board
                  </h3>
                  <p className="mb-3">
                    Once the ceremony closes, the Lodge moves to the Festive Board — a formal but warm
                    dinner held in the dining room at the Guildford Masonic Centre. As the newly
                    initiated candidate, this is your evening. The Entered Apprentice Song is sung in
                    your honour, the traditional Masonic toasts are observed, and you will find
                    yourself at the centre of a room full of people who are genuinely pleased to
                    welcome you.
                  </p>
                  <p>
                    The formality of the ceremony gives way to good food, relaxed conversation, and
                    the kind of warmth that is difficult to describe but immediately felt. This is
                    where the fraternal character of Weybridge Lodge No. 6787 — our Masonic Lodge
                    in Surrey — becomes most visible.
                  </p>
                </div>

                {/* Afterwards */}
                <div>
                  <h3 className="font-serif text-lg font-bold text-card-foreground mb-3">
                    After the Evening
                  </h3>
                  <p>
                    Your Lodge Mentor will stay in contact with you after your initiation. The
                    Entered Apprentice degree is the first of three — and your mentor's role is to
                    support your understanding of the Craft as you progress through your Masonic
                    journey at your own pace, with no pressure and no fixed timeline.
                  </p>
                </div>

              </div>
            </section>

            {/* CTA Banner */}
            <section
              aria-labelledby="cta-heading"
              className="bg-navy border border-border rounded-sm p-8 text-center"
            >
              <h2 id="cta-heading" className="font-serif text-2xl font-bold mb-3 tracking-tight text-gold">
                Have Questions Before Your Initiation?
              </h2>
              <p className="text-primary-foreground/80 font-sans text-sm max-w-md mx-auto mb-6 leading-relaxed">
                If you have specific questions about the evening — access requirements, what to
                bring, travel to the Guildford Masonic Centre — our Lodge Secretary and Mentor
                are both available to help.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-navy font-semibold px-6 py-3 rounded-sm min-h-[48px] w-full sm:w-auto transition-colors"
                  aria-label="Contact the Lodge Secretary at Weybridge Lodge"
                >
                  Contact the Secretary
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/faq"
                  className="inline-flex items-center justify-center border border-gold/60 bg-transparent hover:bg-gold/10 text-gold font-medium px-6 py-3 rounded-sm min-h-[48px] w-full sm:w-auto transition-colors"
                >
                  Read Our FAQs
                </Link>
              </div>
            </section>

            {/* Cross-link */}
            <p className="text-center text-sm text-muted-foreground font-sans mt-10">
              Not yet at this stage?{" "}
              <Link
                to="/join-us"
                className="inline-flex items-center gap-1 text-gold hover:underline font-medium min-h-[48px]"
              >
                Find out how to begin your application
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </p>

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FirstVisit;
