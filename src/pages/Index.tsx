import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Principles from "@/components/Principles";
import NextMeeting from "@/components/NextMeeting";
import JoinCTA from "@/components/JoinCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
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
