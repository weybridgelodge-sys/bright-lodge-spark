import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { MapPin, Clock, Shirt, UserCheck, HelpCircle, ArrowRight } from "lucide-react";

const FirstVisit = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Your First Visit | Weybridge Lodge, Guildford Masonic Centre"
        description="A welcoming, practical guide to your first visit to Weybridge Lodge at the Guildford Masonic Centre — what to wear, when to arrive, and who will meet you."
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
          title="Your First Visit to the Lodge"
          subtitle="A practical, transparent guide for prospective guests visiting the Guildford Masonic Centre"
        />

        <section className="bg-background py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">

            {/* Intro */}
            <div className="text-center mb-16">
              <span className="text-gold font-sans font-semibold tracking-widest uppercase text-xs">Guest Protocol</span>
              <h2 className="font-serif mt-3 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                What to expect on the night
              </h2>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Stepping into a Masonic Centre for the first time can feel daunting. Here is exactly what to expect, what to wear, and how to find us.
              </p>
            </div>

            {/* Practical Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {[
                {
                  icon: MapPin,
                  title: "Our Location",
                  body: "Weybridge Lodge meets at the South West Surrey Masonic Centre, Hitherbury Close, Guildford GU2 4DR — easily reached from Guildford town centre and the A3.",
                },
                {
                  icon: Shirt,
                  title: "Dress Code",
                  body: "For an informal open evening or dinner as a guest, a standard lounge suit, jacket and tie, or smart-casual attire is perfectly appropriate.",
                },
                {
                  icon: Clock,
                  title: "Arrival Timing",
                  body: "Arrive 15 to 20 minutes before the scheduled meeting time. This leaves plenty of time to park, find us, and enjoy a relaxed drink at the bar.",
                },
                {
                  icon: UserCheck,
                  title: "Who Will Meet You",
                  body: "You won't be left wandering. A designated member of our committee will meet you at the main entrance, introduce you to others, and guide you throughout the evening.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="bg-card p-6 rounded-xl border border-border flex gap-4">
                  <div className="p-3 bg-gold/10 rounded-lg h-fit text-gold shrink-0">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-card-foreground mb-1">{title}</h3>
                    <p className="text-muted-foreground font-sans text-sm leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Narrative */}
            <div className="bg-card p-8 rounded-2xl border border-border mb-12">
              <h2 className="font-serif text-2xl font-bold text-card-foreground mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-gold" aria-hidden="true" /> What Happens on the Night?
              </h2>
              <div className="space-y-4 text-muted-foreground font-sans text-sm sm:text-base leading-relaxed">
                <p>
                  If you are visiting for a casual social evening, a prospective member drinks reception, or a public charity event, you will spend your time entirely within our public lounges, bar facilities, and dining rooms.
                </p>
                <p>
                  You will have the opportunity to speak openly with Freemasons from various professions and age groups. There are no secret handshakes or tests during these visits — they are built simply for mutual introductions, breaking down common misconceptions, and enjoying good food and conversation.
                </p>
                <p>
                  If your visit is a formal step toward your application (such as a committee chat), it will take place in a private, quiet room at the centre, but the tone remains friendly, supportive, and entirely conversational.
                </p>
              </div>
            </div>

            {/* CTA Banner */}
            <div className="bg-gradient-to-br from-navy to-navy/95 border border-border rounded-2xl p-8 text-center shadow-xl">
              <h2 className="font-serif text-2xl font-bold mb-3 tracking-tight text-primary-foreground">
                Have Questions About Your Visit?
              </h2>
              <p className="text-primary-foreground/70 font-sans text-sm max-w-md mx-auto mb-6 leading-relaxed">
                For specific access requirements, dietary restrictions, or to clarify travel routes to Guildford, our Lodge Secretary is here to help.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Button asChild className="bg-gold hover:bg-gold/90 text-navy font-semibold px-6 py-5 rounded-lg w-full sm:w-auto">
                  <Link to="/contact" className="flex items-center justify-center gap-2">
                    Contact the Secretary <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-primary-foreground/30 bg-transparent hover:bg-primary-foreground/10 text-primary-foreground font-medium px-6 py-5 rounded-lg w-full sm:w-auto">
                  <Link to="/faq">Read Visitor FAQs</Link>
                </Button>
              </div>
            </div>

            {/* Cross-link to Initiation page */}
            <p className="text-center text-sm text-muted-foreground font-sans mt-10">
              Already passed your ballot?{" "}
              <Link to="/your-initiation" className="text-gold hover:underline font-medium">
                Read what happens on your Initiation Night →
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
