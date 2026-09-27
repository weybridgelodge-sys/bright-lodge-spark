import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Home,
  UserPlus,
  HelpCircle,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

interface RecoveryCard {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  id: string;
}

const recoveryCards: RecoveryCard[] = [
  {
    icon: Home,
    title: "Home",
    description: "Start from the beginning.",
    to: "/",
    id: "recovery-home",
  },
  {
    icon: UserPlus,
    title: "Join Us",
    description:
      "Curious about Freemasonry in Guildford? Find out how to join.",
    to: "/join-us",
    id: "recovery-join-us",
  },
  {
    icon: HelpCircle,
    title: "FAQ",
    description: "Have a question? Find your answer here.",
    to: "/faq",
    id: "recovery-faq",
  },
];

const NotFound = () => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  useEffect(() => {
    window.scrollTo(0, 0);
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

  return (
    <div className="min-h-screen">
      <SEO
        title="Page Not Found"
        description="The page you were looking for could not be found. Return to the Weybridge Lodge No. 6787 homepage, read our FAQ, or find out how to join us in Guildford."
        noindex
      />
      <Header />
      <main id="main-content">
        <section
          className="py-20 md:py-28 bg-warm-white"
          aria-labelledby="notfound-heading"
        >
          <div className="container mx-auto px-6">
            <motion.div {...motionProps()} className="text-center mb-16">
              <p className="text-sm font-sans font-semibold uppercase tracking-widest text-gold mb-4">
                404
              </p>
              <div
                className="h-0.5 w-16 bg-gold mx-auto mb-6"
                aria-hidden="true"
              />
              <h1
                id="notfound-heading"
                className="text-3xl md:text-4xl font-serif text-foreground mb-4"
              >
                We&rsquo;re ever so sorry you&rsquo;ve ended up here
              </h1>
              <p className="text-muted-foreground font-sans leading-relaxed max-w-2xl mx-auto">
                This page may have moved or no longer exists. Let&rsquo;s get
                you back on track:
              </p>
            </motion.div>

            <ul className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto list-none p-0">
              {recoveryCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <motion.li
                    key={card.id}
                    {...motionProps(i * 0.12)}
                    className="list-none"
                  >
                    <Link
                      to={card.to}
                      className="group flex h-full min-h-[48px] flex-col items-start gap-4 rounded-sm border border-border bg-card p-8 transition-colors hover:border-gold/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    >
                      <span
                        className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-navy border border-gold/30"
                        aria-hidden="true"
                      >
                        <Icon className="w-6 h-6 text-gold" aria-hidden="true" />
                      </span>
                      <span className="block">
                        <span
                          id={card.id}
                          className="block text-xl font-serif text-foreground mb-2"
                        >
                          {card.title}
                        </span>
                        <span className="block text-sm text-muted-foreground font-sans leading-relaxed">
                          {card.description}
                        </span>
                      </span>
                      <span
                        className="mt-auto inline-flex items-center text-gold"
                        aria-hidden="true"
                      >
                        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
