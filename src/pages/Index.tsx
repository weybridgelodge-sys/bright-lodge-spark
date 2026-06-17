import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import LodgeTimeline from "@/components/LodgeTimeline";
import Principles from "@/components/Principles";
import Testimonials from "@/components/Testimonials";
import LiveEventsFeed from "@/components/LiveEventsFeed";
import NextMeeting from "@/components/NextMeeting";
import JoinCTA from "@/components/JoinCTA";
import Footer from "@/components/Footer";
import SEO, { organizationSchema } from "@/components/SEO";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Weybridge Lodge No. 6787"
        description="Weybridge Lodge No. 6787 — an open, friendly Freemasons Lodge in Guildford, Surrey. Join our welcoming community at the South West Surrey Masonic Centre."
        canonical="/"
        schema={organizationSchema}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <Hero />
        <About />
        <LodgeTimeline />
        <Principles />

        {/* Quiz invitation banner */}
        <section className="py-12 sm:py-14 bg-card border-y border-border">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl flex flex-col md:flex-row items-center justify-between gap-5 md:gap-6 text-center md:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
              <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-gold shrink-0 sm:mt-1" aria-hidden="true" />
              <div>
                <h2 className="text-xl sm:text-2xl font-serif text-foreground">Is Freemasonry for me?</h2>
                <p className="text-muted-foreground font-sans text-sm mt-1">
                  Take our short 5-question quiz for a personalised answer.
                </p>
              </div>
            </div>
            <Link
              to="/quiz"
              className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-5 sm:px-6 py-3 rounded-sm text-xs sm:text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity shrink-0 w-full md:w-auto"
            >
              Start the Quiz <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        <Testimonials />
        <LiveEventsFeed />
        <NextMeeting />
        <JoinCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

