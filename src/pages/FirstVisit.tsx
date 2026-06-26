import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { Link } from "react-router-dom";
import { MapPin, Clock, Shirt, UserCheck, HelpCircle, ArrowRight } from "lucide-react";

interface InfoCard {
  icon: React.ElementType;
  title: string;
  body: string;
}

const infoCards: InfoCard[] = [
  {
    icon: MapPin,
    title: "Our Location",
    body: "Weybridge Lodge meets at the Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford GU2 4DR — easily reached from Guildford town centre and the A3.",
  },
  {
    icon: Shirt,
    title: "Dress Code",
    body: "For an informal dinner as a guest, a standard lounge suit, jacket, and tie will suffice. If coming for your initial contact, drinks or a discovery meeting and tour, then casual wear is absolutely fine.",
  },
  {
    icon: Clock,
    title: "Arrival Timing",
    body: "Arrive 15 to 20 minutes before the scheduled meeting time. This leaves plenty of time to park, find us, and enjoy a relaxed drink at the bar.",
  },
  {
    icon: UserCheck,
    title: "Who Will Meet You",
    body: "You will not be left wandering. A designated member of our committee will meet you at the main entrance, introduce you to others, and guide you throughout the evening.",
  },
];

const FirstVisit = () => {
  const pageSchema = useMemo(() => {
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Your First Visit", url: "/first-visit" },
    ]);

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://www.weybridgelodge.org.uk/first-visit#webpage",
        url: "https://www.weybridgelodge.org.uk/first-visit",
        name: "Your First Visit | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "A practical guide to your first visit to Weybridge Lodge No. 6787 at the Guildford Masonic Centre, GU2 4DR. What to wear, when to arrive, and who will meet you at our Masonic Lodge in Surrey.",
        inLanguage: "en-GB",
        isPartOf: {
          "@id": "https://www.weybridgelodge.org.uk/#website",
        },
      },
      breadcrumb,
    ];
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Your First Visit"
        description="A practical guide to your first visit to Weybridge Lodge No. 6787 at the Guildford Masonic Centre, GU2 4DR. What to wear, when to arrive, and who will meet you at our Masonic Lodge in Surrey."
        canonical="/first-visit"
        schema={pageSchema}
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
            <section aria-labelledby="intro-heading" className="text-center mb-16">
              <span className="text-gold font-sans font-semibold tracking-widest uppercase text-xs">
                Guest Protocol
              </span>
              <h2 id="intro-heading" className="font-serif mt-3 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                What to expect on the night
              </h2>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Stepping into a Masonic Centre for the first time can feel daunting. Here is exactly
                what to expect, what to wear, and how to find our Freemasons Lodge in Guildford.
              </p>
            </section>

            {/* Practical Information Grid */}
            <section aria-labelledby="practical-heading" className="mb-12">
              <h2 id="practical-heading" className="sr-only">
                Practical information for your first visit to Weybridge Lodge in Guildford
              </h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 list-none p-0">
                {infoCards.map(({ icon: Icon, title, body }) => (
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

            {/* Narrative Block */}
            <section
              aria-labelledby="narrative-heading"
              className="bg-card p-8 rounded-sm border border-border mb-12"
            >
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="h-5 w-5 text-gold" aria-hidden="true" />
                <h2 id="narrative-heading" className="font-serif text-2xl font-bold text-card-foreground">
                  What Happens on the Night?
                </h2>
              </div>
              <div className="space-y-4 text-muted-foreground font-sans text-sm sm:text-base leading-relaxed">
                <p>
                  If you are visiting for a casual social evening, a prospective member drinks
                  reception, or a public charity event, you will spend your time entirely within
                  our public lounges, bar facilities, and dining rooms at the Guildford Masonic
                  Centre, GU2 4DR.
                </p>
                <p>
                  You will have the opportunity to speak openly with Freemasons from various
                  professions and age groups. There are no secret handshakes or tests during
                  these visits — they are built simply for mutual introductions, breaking down
                  common misconceptions, and enjoying good food and conversation at our Masonic
                  Lodge in Surrey.
                </p>
                <p>
                  If your visit is a formal step toward your application — such as a committee
                  chat — it will take place in a private, quiet room at the centre, but the
                  tone remains friendly, supportive, and entirely conversational.
                </p>
              </div>
            </section>

            {/* CTA Banner */}
            <section
              aria-labelledby="cta-heading"
              className="bg-navy border border-border rounded-sm p-8 text-center"
            >
              <h2 id="cta-heading" className="font-serif text-2xl font-bold mb-3 tracking-tight text-gold">
                Have Questions About Your Visit?
              </h2>
              <p className="text-primary-foreground/80 font-sans text-sm max-w-md mx-auto mb-6 leading-relaxed">
                For specific access requirements, dietary restrictions, or to clarify travel
                routes to the Guildford Masonic Centre, our Lodge Secretary is here to help.
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
                  Read Visitor FAQs
                </Link>
              </div>
            </section>

            {/* Cross-link to Initiation page */}
            <p className="text-center text-sm text-muted-foreground font-sans mt-10">
              Already passed your ballot?{" "}
              <Link
                to="/your-initiation"
                className="inline-flex items-center gap-1 text-gold hover:underline font-medium min-h-[48px]"
              >
                Read what happens on your Initiation Night
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
