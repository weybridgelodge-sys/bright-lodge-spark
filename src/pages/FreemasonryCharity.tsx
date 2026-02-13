import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import { Heart, PoundSterling, Stethoscope, Users } from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  { icon: PoundSterling, value: "£1M", label: "Raised weekly by UK Freemasons" },
  { icon: Heart, value: "50%+", label: "Given to non-masonic charities" },
  { icon: Stethoscope, value: "£5.9M+", label: "Donated to surgical research since 1967" },
  { icon: Users, value: "150+", label: "Charities supported each year by MCF" },
];

const FreemasonryCharity = () => {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Freemasonry & Charity"
          subtitle="One of the largest private charitable donors in the United Kingdom"
        />

        {/* Intro */}
        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-muted-foreground font-sans leading-relaxed text-lg mb-6">
                What many people may not know is that Freemasonry is a great contributor to charities. Through the generosity of Freemasons and their families we are able to raise almost £1,000,000 a week in the cause of charity — an astounding figure.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg">
                Built upon the founding precepts of helping those who are less fortunate, this work continues today amongst not only its members and their dependents, but the wider community — with over 50% of funds raised being given to non-masonic national and local charities. This includes long-term funding for medical research such as prostate and ovarian cancer.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-navy-gradient">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="text-center"
                >
                  <stat.icon className="w-8 h-8 text-gold mx-auto mb-3" />
                  <p className="text-3xl md:text-4xl font-serif text-primary-foreground mb-1">{stat.value}</p>
                  <p className="text-xs text-primary-foreground/60 font-sans">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FFSR */}
        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="h-0.5 w-16 bg-gold mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">The Freemasons' Fund For Surgical Research</h2>
              <p className="text-muted-foreground font-sans leading-relaxed mb-6">
                The FFSR is a charitable organisation that provides grants to Research Fellows of the Royal College of Surgeons (RCS England) to pursue groundbreaking research projects. With over 50 years of history, the FFSR has played a vital role in supporting innovative research.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed">
                Funded entirely by Freemasons, the FFSR has donated over £5.9 million to the RCS England since 1967, with the current value of the fund being approximately £7 million. The fund's mission is to support clinical research and contribute to the advancement of surgical knowledge and patient care.
              </p>
            </motion.div>
          </div>
        </section>

        {/* MCF */}
        <section className="py-20 md:py-28 bg-navy-gradient">
          <div className="container mx-auto px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="h-0.5 w-16 bg-gold mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-primary-foreground mb-6">The Masonic Charitable Foundation</h2>
              <p className="text-primary-foreground/70 font-sans leading-relaxed mb-6">
                The MCF was set up to bring together the four national Masonic charities which have operated under different names since the 18th century:
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "The Freemasons' Grand Charity",
                  "The Royal Masonic Trust for Girls and Boys",
                  "The Royal Masonic Benevolent Institution",
                  "The Masonic Samaritan Fund",
                ].map((name) => (
                  <li key={name} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                    <span className="text-primary-foreground/80 font-sans">{name}</span>
                  </li>
                ))}
              </ul>
              <p className="text-primary-foreground/70 font-sans leading-relaxed">
                The MCF receives over 1,200 requests per year for both small and large grants with over 150 charities benefitting each year. All funds are raised directly by local Lodge members and their families — contributions are at the sole discretion of individual members.
              </p>
            </motion.div>

            <div className="text-center mt-12">
              <Link
                to="/our-charities"
                className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                View Our Local Charities
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FreemasonryCharity;
