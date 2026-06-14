import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Car, Coffee, Users, Utensils, Handshake, Clock, Shirt, ParkingCircle } from "lucide-react";

const timeline = [
  {
    time: "5:30 pm",
    icon: ParkingCircle,
    title: "You arrive",
    body: "Free parking on site at the South West Surrey Masonic Centre, Hitherbury Close, Guildford GU2 4DR. Look for the gold sign — someone will be at the door to greet you by name.",
  },
  {
    time: "5:40 pm",
    icon: Coffee,
    title: "Tea, coffee & introductions",
    body: "You'll meet a few members in the bar area — including your sponsor and our Membership Secretary. No pressure, no quizzes. Just a friendly chat to put you at ease.",
  },
  {
    time: "6:00 pm",
    icon: Users,
    title: "We go in — but not you (yet)",
    body: "Members head into the Lodge room for the formal meeting. As a visitor exploring membership, you'll relax in our comfortable lounge with a drink, a host, and any questions you have.",
  },
  {
    time: "7:30 pm",
    icon: Utensils,
    title: "Dinner together",
    body: "Everyone reconvenes for a proper three-course meal in the dining room. This is where most of the real conversation happens — relaxed, sociable, and where you'll get a genuine sense of who we are.",
  },
  {
    time: "9:30 pm",
    icon: Handshake,
    title: "No pressure. No obligation.",
    body: "You go home, sleep on it, and let us know if you'd like to come back. Joining is your decision, on your timeline. Most prospective members visit two or three times before deciding.",
  },
];

const FirstVisit = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Your First Visit to Weybridge Lodge | Guildford Freemasons"
        description="Curious about Freemasonry in Guildford? Here's exactly what happens when you visit Weybridge Lodge No. 6787 for the first time — timings, dress, dinner and more."
        canonical="/first-visit"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Your First Visit", url: "/first-visit" },
        ])}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Your First Visit"
          subtitle="What actually happens — minute by minute — when you come to meet us"
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
                It's a lot less mysterious than you'd think
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed">
                A first visit isn't an interview, an audition, or a leap of faith. It's just dinner with a group of welcoming people who'd like to get to know you — and for you to get to know us. Here's how a typical evening unfolds.
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
                { icon: Clock, title: "How long it takes", body: "Plan for about four hours, door to door. You're free to leave any time after dinner." },
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
              Ready to come along?
            </h2>
            <p className="text-primary-foreground/70 font-sans mb-8">
              Drop us a quick line and we'll suggest the next suitable evening to visit. There's no commitment beyond a friendly meal.
            </p>
            <Link
              to="/join-us"
              className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Arrange A Visit
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FirstVisit;
