import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, User, ArrowLeft } from "lucide-react";

import heroImg from "@/assets/news/sands-cheque.webp";
import wayneImg from "@/assets/news/wayne-griffiths.png";

const tocItems = [
  { id: "great-effort", label: "Great Effort as Weybridge Lodge Raises Over £31,000 for Sands" },
  { id: "community-united", label: "A Community United" },
  { id: "transforming-lives", label: "Freemasons Charity Donation Transforming Lives" },
  { id: "shared-vision", label: "A Shared Vision" },
  { id: "inspired", label: "Inspired By What You Have Read?" },
];

const SandsCharity = () => {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Weybridge Lodge Raise £31,000 for SANDS Charity"
          subtitle="Charity News"
        />

        <section className="py-16 md:py-24 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            {/* Meta */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8"
            >
              <Link to="/news" className="inline-flex items-center gap-1 text-primary hover:underline font-sans">
                <ArrowLeft className="h-4 w-4" /> Back to News
              </Link>
              <span className="hidden sm:inline">|</span>
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> 12 December 2024</span>
              <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> W Bro. Julien Tidmarsh</span>
            </motion.div>

            {/* Hero image */}
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              src={heroImg}
              alt="Weybridge Lodge of Freemasons present a large charity cheque for £31,000 to SANDS, a local charity who support parents affected by pregnancy loss"
              className="w-full rounded-sm mb-10"
            />

            {/* Table of Contents */}
            <motion.nav
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              aria-label="Table of contents"
              className="mb-12 p-6 border border-border rounded-sm bg-card"
            >
              <h2 className="text-lg font-serif text-foreground mb-3">Table of Contents</h2>
              <ol className="list-decimal list-inside space-y-1.5">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="text-sm font-sans text-primary hover:underline">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </motion.nav>

            {/* Article body */}
            <article className="prose-custom space-y-10">
              {/* Great Effort */}
              <section id="great-effort">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Great Effort as Weybridge Masonic Lodge Raises Over £31,000 for Sands</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  In a testament to the power of community and compassion, Weybridge Masonic Lodge has helped raise a staggering £31,331.15 in support of Sands. This remarkable achievement was the result of the Lodge's Ladies Festival, a dinner and dance event hosted by Worshipful Master Richard Smith and his wife, Cara Smith. Held at The Lismoyne Hotel in Fleet, Hampshire, the event brought together 95 members of the Lodge, along with friends and family, for an unforgettable evening of camaraderie and generosity.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  The event's highlight was a moving speech by Morgan Mepham, a Befriender and Hospital Liaison Volunteer for Farnborough Sands, who shared her personal story of losing her twin boys and the impact Sands has had on her family. Her heartfelt testimony highlighted the critical work Sands does in providing bereavement support and working to save babies' lives.
                </p>
              </section>

              {/* Community United */}
              <section id="community-united">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">A Community United</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  The Ladies Festival was a true community effort, with support pouring in from local businesses who donated a variety of raffle prizes and contributed to a highly successful auction and also key individuals who ensured event income was maximised. Thanks to this collective generosity, the event became one of the most significant fundraising achievements for the Lodge.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  Worshipful Master Richard Smith of Weybridge Lodge said: "This is one of the highest amounts ever raised for a charity in our Province through a single event. We are proud to have supported a cause that holds deep personal meaning for many of our members."
                </p>
              </section>

              {/* Transforming Lives */}
              <section id="transforming-lives">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Freemasons Charity Donation Transforming Lives</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  The funds raised will help Sands continue its vital work, providing expert bereavement support to families across the UK and empowering local support groups, such as Farnborough Sands. The charity's mission to save babies' lives and ensure equal access to bereavement care is driven by the passion and commitment of supporters like those at Weybridge Lodge.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  Wayne Griffiths, Chair and Befriender, Farnborough Sands said:
                </p>
                <div className="flex flex-col sm:flex-row items-start gap-5 mt-6 p-5 border border-border rounded-sm bg-card">
                  <img
                    src={wayneImg}
                    alt="Wayne Griffiths, Chair and Befriender, Farnborough Sands"
                    className="w-20 h-20 rounded-full object-cover shrink-0"
                    loading="lazy"
                  />
                  <blockquote className="text-muted-foreground font-sans text-sm leading-relaxed italic">
                    "We are incredibly grateful to Weybridge Lodge for their tremendous fundraising efforts. Your generosity will make a tangible difference to bereaved families and support our mission to create a safer future for babies in the UK. We simply couldn't achieve our goals without the kindness and dedication of supporters like you. To all at Weybridge Lodge and to the community of supporters who made the event such a success, your efforts have made a profound impact, and for that, we all extend our deepest thanks."
                  </blockquote>
                </div>
              </section>

              {/* Shared Vision */}
              <section id="shared-vision">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">A Shared Vision</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  Weybridge Masonic Lodge's success is a shining example of what can be achieved when a community comes together for a common purpose. Their commitment to supporting Sands pays great tribute to the values of charity and service that lie at the heart of the Freemasons.
                </p>
                <p className="text-muted-foreground font-sans leading-relaxed mt-4">
                  As Sands continues its vital work, bolstered by the generosity of donors, it reaffirms the importance of partnerships like this one in creating a brighter future for families across the country.
                </p>
              </section>

              {/* Inspired */}
              <section id="inspired">
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl font-serif text-foreground mb-4">Inspired By What You Have Read?</h2>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  If you have been inspired by our efforts and feel that taking that first step into Freemasonry is for you, or if you are a company that would like to partner with us on future fundraising events, please{" "}
                  <Link to="/contact" className="text-primary hover:underline">contact Weybridge Lodge</Link>.
                </p>
              </section>
            </article>

            {/* Author */}
            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-sm font-serif text-foreground font-semibold">W Bro. Julien Tidmarsh</p>
              <p className="text-xs text-muted-foreground font-sans mt-1">
                Julien is the current Mentor and Tech Guy for Weybridge Lodge and has been a member since 2019.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SandsCharity;
