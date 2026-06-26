import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { masters } from "@/data/worshipfulMasters";

const WorshipfulMasters = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Worshipful Masters | Roll of Honour 1949–Present"
        description="The complete Roll of Honour of every Worshipful Master of Weybridge Lodge No. 6787, Guildford, from our founding in 1949 to the present day."
        canonical="/worshipful-masters"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "About Us", url: "/#about" },
          { name: "Worshipful Masters", url: "/worshipful-masters" },
        ])}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Worshipful Masters"
          subtitle="Roll of Honour — 1949 to Present"
        />

        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <p className="text-muted-foreground font-sans leading-relaxed">
                There is no greater honour in a Freemason's lodge journey than being chosen as Worshipful Master. The position is earned over years of service — conducting ceremonies, supporting fellow members, and learning the craft from the inside. In a lodge of Weybridge's tradition, a brother would typically spend six or more years progressing through the offices before taking the Chair.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed">
                The Worshipful Master presides over every meeting, leads the Brethren through their Masonic degrees, and is — for that year — the face of the Lodge. Roy Edmonds, our founding Worshipful Master in 1949, set the standard: a stickler for Masonic etiquette and good ritual, but always approachable and generous with his guidance. His son Freddie, the Lodge's first Initiate, waited eight years before following him into the Chair in 1957. That continuity of purpose — of earning the honour — remains the hallmark of Weybridge Lodge today.
              </p>
              <p className="text-foreground font-sans leading-relaxed pt-2">
                The complete Roll of Honour of every Worshipful Master who has served Weybridge Lodge since our consecration in 1949 is recorded below.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-navy-gradient">
          <div className="container mx-auto px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0"
            >
              <div className="bg-primary-foreground/5 border border-gold/20 rounded-sm p-4 sm:p-6 md:p-8 backdrop-blur-sm min-w-[480px] md:min-w-0">
                <table className="w-full text-left">
                  <thead>
                   <tr className="border-b border-gold/30">
                      <th scope="col" className="text-gold text-xs font-sans uppercase tracking-widest py-4 pr-6">Year</th>
                      <th scope="col" className="text-gold text-xs font-sans uppercase tracking-widest py-4 pr-6">Name</th>
                      <th scope="col" className="text-gold text-xs font-sans uppercase tracking-widest py-4">Honours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masters.map((m, i) => (
                      <tr key={i} className="border-b border-primary-foreground/10 hover:bg-primary-foreground/5 transition-colors">
                        <td className="text-primary-foreground/80 font-sans text-sm py-3 pr-6">{m.year}</td>
                        <td className="text-primary-foreground font-sans text-sm py-3 pr-6">{m.name}</td>
                        <td className="text-primary-foreground/60 font-sans text-xs py-3">{m.honours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            <p className="text-primary-foreground/60 font-sans text-xs italic leading-relaxed mt-6 max-w-3xl mx-auto text-center">
              Provincial and Grand honours are shown where held at time of service or subsequently attained. If you believe an entry requires correction or addition, please contact the Lodge Secretary.
            </p>

            <p className="text-primary-foreground/85 font-sans leading-relaxed mt-12 max-w-2xl mx-auto text-center">
              The role of Worshipful Master is one of the defining privileges of a Freemason's life. If you are curious about what that journey looks like — from first steps as an Entered Apprentice to the Chair of the Lodge — we would be delighted to{" "}
              <Link to="/join-us" className="text-gold underline underline-offset-4 hover:text-gold/80 transition-colors">
                tell you more
              </Link>
              .
            </p>

            <div className="text-center mt-12">
              <Link
                to="/officers"
                className="inline-flex items-center justify-center border border-primary-foreground/30 text-primary-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
              >
                View Officers of the Lodge
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};


export default WorshipfulMasters;
