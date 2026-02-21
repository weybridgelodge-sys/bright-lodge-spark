import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { ExternalLink, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import sandsLogo from "@/assets/links/sands-logo.jpg";
import tlcLogo from "@/assets/links/tlc-logo.ico";
import surrey2030Logo from "@/assets/surrey-2030-gold.png";

const charities = [
  {
    name: "Surrey 2030 Festival — Masonic Charitable Foundation",
    highlight: "Gold Festival Award achieved",
    description: "Weybridge Lodge has officially secured the prestigious Gold Festival Award for the Surrey 2030 Festival, raising over £15,800 for the Masonic Charitable Foundation in just five months. The Festival supports life-changing grants for individuals and families in times of need, funding medical treatment, education, and daily living assistance.",
    url: "https://surreymason.org.uk/surrey-2030-festival/",
    postUrl: "/news/surrey-2030-festival-gold",
    logo: surrey2030Logo,
  },
  {
    name: "Farnborough SANDS",
    highlight: "Our proudest achievement so far",
    description: "Weybridge Lodge have made their largest charitable donation to date. £31,331.15 was given to SANDS, a charity who support parents affected by stillborn or neonatal death.",
    url: "https://www.farnboroughsands.co.uk/",
    postUrl: "/news/sands-charity",
    logo: sandsLogo,
  },
  {
    name: "TLC Appeal Surrey — Teddies For Loving Care",
    highlight: "Lodge and Chapter Patron Program — Gold Patron",
    description: "Weybridge 6787 has committed to support TLC for the next 5 years. This year TLC are on track to deliver over 14,000 bears to 10 A&E departments across Surrey, as well as supporting charities including I Choose Freedom and the Royal Marsden Children's Cancer Ward.",
    url: "https://tlcappealsurrey.org.uk/",
    logo: tlcLogo,
  },
];

const OurCharities = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Our Charities | Weybridge Lodge Charitable Work"
        description="Weybridge Lodge No. 6787 supports charities including SANDS and TLC Appeal Surrey. See how Freemasons in Guildford give back to their community."
        canonical="/our-charities"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Charity", url: "/freemasonry-and-charity" },
          { name: "Our Charities", url: "/our-charities" },
        ])}
      />
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
                <div className="flex items-start gap-5 mb-4">
                  <img
                    src={charity.logo}
                    alt={`${charity.name} charity logo`}
                    className="w-14 h-14 object-contain flex-shrink-0 rounded-sm bg-white p-1"
                    loading="lazy"
                  />
                  <div>
                    <p className="text-gold text-sm font-sans uppercase tracking-wide mb-2">{charity.highlight}</p>
                    <h3 className="text-2xl font-serif text-primary-foreground">{charity.name}</h3>
                  </div>
                </div>
                <p className="text-primary-foreground/70 font-sans leading-relaxed mb-6">{charity.description}</p>
                {charity.postUrl && (
                  <Link
                    to={charity.postUrl}
                    className="inline-flex items-center gap-2 text-gold hover:text-gold-light transition-colors text-sm font-sans mb-3"
                  >
                    Read the Full Story <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
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
