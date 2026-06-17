import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { mastersRoll as masters } from "@/data/worshipfulMasters";

const WorshipfulMasters = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Worshipful Masters Since 1949 | Weybridge Lodge History"
        description="Complete roll of honour of all Worshipful Masters of Weybridge Lodge No. 6787 from 1949 to present day. A proud Masonic history in Guildford, Surrey."
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
            >
              <p className="text-muted-foreground font-sans leading-relaxed mb-8">
                There is no greater honour as a Freemason than being chosen to be the Worshipful Master. This position has not come lightly — you would have spent at least six years performing other roles in order to take on the Chair. The Worshipful Master instructs and leads the Brethren through their Masonic journey, conducts ceremonies, and is the face of the Lodge.
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
