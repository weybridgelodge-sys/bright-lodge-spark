import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Principles from "@/components/Principles";
import NextMeeting from "@/components/NextMeeting";
import JoinCTA from "@/components/JoinCTA";
import Footer from "@/components/Footer";
import SEO, { organizationSchema } from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Weybridge Lodge No. 6787 | Freemasons in Guildford, Surrey"
        description="Weybridge Lodge No. 6787 — an open, friendly Freemasons Lodge in Guildford, Surrey. Join our welcoming community at the South West Surrey Masonic Centre."
        canonical="/"
        schema={organizationSchema}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <Hero />
        <About />
        <Principles />
        <NextMeeting />
        <JoinCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
