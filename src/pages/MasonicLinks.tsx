import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

import ugleLogo from "@/assets/links/ugle-logo.png";
import surreyLogo from "@/assets/links/surrey-logo.png";
import metglLogo from "@/assets/links/metgl-logo.png";
import mcfLogo from "@/assets/links/mcf-logo.png";
import hfafLogo from "@/assets/links/hfaf-logo.png";
import royalarchLogo from "@/assets/links/royalarch-logo.png";
import museumLogo from "@/assets/links/museum-freemasonry-logo.png";
import astolatLogo from "@/assets/links/astolat-logo.png";

const links = [
  {
    name: "United Grand Lodge of England (UGLE)",
    url: "https://www.ugle.org.uk/",
    description: "The governing body of Freemasonry in England, Wales and certain other territories.",
    logo: ugleLogo,
  },
  {
    name: "Provincial Grand Lodge of Surrey",
    url: "https://surreyfreemasons.org.uk/",
    description: "The Provincial Grand Lodge overseeing Freemasonry across Surrey.",
    logo: surreyLogo,
  },
  {
    name: "Metropolitan Grand Lodge of London",
    url: "https://www.metgl.com/",
    description: "The Metropolitan Grand Lodge serving Freemasons in London.",
    logo: metglLogo,
  },
  {
    name: "Masonic Charitable Foundation (MCF)",
    url: "https://mcf.org.uk/",
    description: "The principal charity funded by Freemasons, supporting members, families and the wider community.",
    logo: mcfLogo,
  },
  {
    name: "Freemasonry for Women (HFAF)",
    url: "https://hfaf.org/",
    description: "One of the two main Grand Lodges in the UK exclusively for women.",
    logo: hfafLogo,
  },
  {
    name: "Holy Royal Arch",
    url: "https://www.royalarch.com/",
    description: "The Supreme Grand Chapter of Royal Arch Masons of England.",
    logo: royalarchLogo,
  },
  {
    name: "Museum of Freemasonry",
    url: "https://museumoffreemasonry.org.uk/",
    description: "Located at Freemasons' Hall in London, home to one of the finest collections of Masonic artefacts.",
    logo: museumLogo,
  },
  {
    name: "Astolat Lodge No. 5848",
    url: "https://astolat.org.uk/",
    description: "A sister lodge also meeting at the South West Surrey Masonic Centre.",
    logo: astolatLogo,
  },
];

const MasonicLinks = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Masonic Links | UGLE, Provincial Grand Lodge of Surrey"
        description="Useful Masonic links including the United Grand Lodge of England (UGLE), Provincial Grand Lodge of Surrey, and the Masonic Charitable Foundation."
        canonical="/masonic-links"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "About Us", url: "/#about" },
          { name: "Masonic Links", url: "/masonic-links" },
        ])}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Masonic Links"
          subtitle="Useful Masonic websites and resources"
        />

        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <div className="space-y-6">
              {links.map((link, i) => (
                <motion.a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="block p-6 rounded-sm border border-border bg-card hover:border-gold/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={link.logo}
                        alt={`${link.name} logo`}
                        className="w-10 h-10 object-contain flex-shrink-0 rounded-sm mt-0.5"
                        loading="lazy"
                      />
                      <div>
                        <h3 className="font-serif text-foreground group-hover:text-gold transition-colors mb-1">
                          {link.name}
                        </h3>
                        <p className="text-muted-foreground font-sans text-sm">{link.description}</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors flex-shrink-0 mt-1" />
                  </div>
                </motion.a>
              ))}
            </div>

            <div className="text-center mt-16">
              <Link
                to="/join-us"
                className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Join Weybridge Lodge
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default MasonicLinks;
