import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Car, DoorOpen, Sparkles, Utensils, Moon, Clock, Shirt, ParkingCircle, Users } from "lucide-react";

const timeline = [
  {
    time: "Before the night",
    icon: Users,
    title: "Everything that leads here",
    body: "By the time you reach your initiation night, we've already spoken on the phone, exchanged emails, shown you around the Masonic Centre, and met for a relaxed informal interview. You've completed your application form and your ballot has been successful. Now all that remains is the evening itself.",
  },
  {
    time: "4:30 pm",
    icon: DoorOpen,
    title: "Arrival & greeting",
    body: "You'll arrive at the South West Surrey Masonic Centre, Hitherbury Close, Guildford GU2 4DR, and be greeted warmly by your sponsor and the Director of Ceremonies. There'll be time to settle in, meet a few familiar faces, and calm any nerves. Free parking is available on site.",
  },
  {
    time: "5:30 pm",
    icon: Sparkles,
    title: "The ceremony of Initiation",
    body: "You'll be escorted into the Lodge room and prepared for the ceremony. Don't worry — you don't need to memorise anything, and you won't be left alone for a single moment. Your sponsor is with you throughout. The initiation is a beautiful, time-honoured ceremony rich in symbolism. Think of it as a short allegorical play in which you are the central character, depicting a journey from darkness into light — the beginning of your Masonic life.",
  },
  {
    time: "7:00 pm",
    icon: Utensils,
    title: "The Festive Board",
    body: "After the ceremony, everyone retires to the dining room for a celebratory three-course meal. This is where the real celebration happens — your new brethren will want to congratulate you, welcome you properly, and hear your first impressions. It's relaxed, warm, and one of the best parts of the evening.",
  },
  {
    time: "9:00 pm",
    icon: Moon,
    title: "Home as a Freemason",
    body: "You leave with new friends, a new title — Entered Apprentice — and the start of a journey that lasts a lifetime. Most men describe their initiation as one of the most memorable and positive experiences they've ever had. You'll sleep well that night.",
  },
];

const FirstVisit = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Your Initiation Night | Becoming a Freemason at Weybridge Lodge"
        description="What actually happens on your initiation night at Weybridge Lodge No. 6787 — from arrival to the Festive Board. Your first visit as a Freemason in Guildford."
        canonical="/first-visit"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Your Initiation Night", url: "/first-visit" },
        ])}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Your Initiation Night"
          subtitle="Your first visit to Weybridge Lodge — what to expect, minute by minute"
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
                The beginning of a remarkable journey
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed">
                Every Freemason remembers his initiation night. It is the moment you formally enter the Craft, received into the Lodge by your new brethren in a ceremony that has been performed for centuries. There is nothing to fear and nothing to memorise — your sponsor will be beside you throughout. Here is how the evening unfolds.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-12 sm:py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
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
                        <div className="w-12 h-12 rounded-full bg-navy text-gold flex items-center justify-center border border-gold/40 shadow-md">
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </div>
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-gold font-sans text-xs uppercase tracking-widest mb-1">{step.time}</p>
                        <h3 className="text-xl font-serif text-foreground mb-2">{step.title}</h3>
                        <p className="text-muted-foreground font-sans text-sm leading-relaxed">{step.body}</p>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* Practicals */}
        <section className="py-12 sm:py-20 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="text-center mb-12">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground">The practical bits</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Shirt, title: "What to wear", body: "A dark business suit, white shirt, plain dark tie. Smart but standard — nothing you don't already own." },
                { icon: Car, title: "Getting here", body: "Free on-site parking. Five minutes from Guildford station by taxi, or a 15-minute walk." },
                { icon: Clock, title: "How long it takes", body: "Plan for about four hours, door to door. The ceremony itself lasts around 90 minutes, followed by dinner." },
                { icon: Utensils, title: "Dietary needs", body: "Just let us know in advance — vegetarian, vegan, gluten-free, allergies. All easily handled." },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="bg-card border border-border rounded-sm p-6">
                  <Icon className="w-6 h-6 text-gold mb-3" aria-hidden="true" />
                  <h3 className="font-serif text-foreground text-lg mb-2">{title}</h3>
                  <p className="text-muted-foreground font-sans text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-navy">
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
            <h2 className="text-2xl md:text-3xl font-serif text-primary-foreground mb-4">
              Ready to begin the journey?
            </h2>
            <p className="text-primary-foreground/70 font-sans mb-8">
              Every Freemason started with a single conversation. Drop us a line and we'll talk you through the steps — no pressure, no obligation.
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

export default FirstVisit;
