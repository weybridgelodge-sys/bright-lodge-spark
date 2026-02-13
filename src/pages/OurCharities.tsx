import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const charities = [
  {
    name: "Farnborough SANDS",
    highlight: "Our proudest achievement so far",
    description: "Weybridge Lodge have made their largest charitable donation to date. £31,331.15 was given to SANDS, a charity who support parents affected by stillborn or neonatal death.",
    url: "https://www.farnboroughsands.co.uk/",
  },
  {
    name: "TLC Appeal Surrey — Teddies For Loving Care",
    highlight: "Lodge and Chapter Patron Program — Gold Patron",
    description: "Weybridge 6787 has committed to support TLC for the next 5 years. This year TLC are on track to deliver over 14,000 bears to 10 A&E departments across Surrey, as well as supporting charities including I Choose Freedom and the Royal Marsden Children's Cancer Ward.",
    url: "https://tlcappealsurrey.org.uk/",
  },
];

const OurCharities = () => {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Our Charities"
          subtitle="Charity sits at the heart of every Freemason and Masonic Lodge"
        />

        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-muted-foreground font-sans leading-relaxed text-lg mb-6"
            >
              Charity sits at the heart of every Freemason and Masonic Lodge, and Weybridge 6787 is no different. As a Lodge, tens of thousands of pounds are raised both collectively and individually through various channels such as Gala Dinners, raffles, sponsorship and donations.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-muted-foreground font-sans leading-relaxed text-lg"
            >
              At Weybridge, the expectation of members for charitable commitments is entirely the matter for the individual and their personal circumstances. Donating is never expected to be to the detriment of the member or his family.
            </motion.p>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-navy-gradient">
          <div className="container mx-auto px-6 max-w-4xl space-y-12">
            {charities.map((charity, i) => (
              <motion.div
                key={charity.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="p-8 md:p-10 rounded-sm border border-gold/15 bg-navy-light/30"
              >
                <p className="text-gold text-sm font-sans uppercase tracking-wide mb-2">{charity.highlight}</p>
                <h3 className="text-2xl font-serif text-primary-foreground mb-4">{charity.name}</h3>
                <p className="text-primary-foreground/70 font-sans leading-relaxed mb-6">{charity.description}</p>
                <a
                  href={charity.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-gold hover:text-gold-light transition-colors text-sm font-sans"
                >
                  Visit Website <ExternalLink className="w-4 h-4" />
                </a>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link
              to="/freemasonry-and-charity"
              className="inline-flex items-center justify-center border border-primary-foreground/30 text-primary-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
            >
              Freemasonry &amp; Charity
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default OurCharities;
