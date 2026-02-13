import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const officers = [
  { office: "Worshipful Master", name: "W. Bro. J.P. Tidmarsh", honours: "", progressive: false },
  { office: "Immediate Past Master", name: "W. Bro. M. Grubb Jnr", honours: "", progressive: false },
  { office: "Senior Warden", name: "W. Bro. B.C. Connolly", honours: "PProvGStwd", progressive: true },
  { office: "Junior Warden", name: "W. Bro. K.N. Holdsworth", honours: "", progressive: true },
  { office: "Chaplain", name: "W. Bro. A.J.S. Mallard", honours: "M.B.E. / PPAGDC", progressive: false },
  { office: "Treasurer", name: "W. Bro. J.G. Scott", honours: "PPAGDC", progressive: false },
  { office: "Secretary", name: "W. Bro. R.D. Smith", honours: "PPAGSwdB", progressive: false },
  { office: "Director of Ceremonies", name: "W. Bro. K.P. Brennan", honours: "PPGSuptWks", progressive: false },
  { office: "Almoner", name: "Bro. S. Stamper", honours: "", progressive: false },
  { office: "Charity Steward", name: "W. Bro. K.N. Holdsworth", honours: "", progressive: false },
  { office: "Lodge Membership Officer", name: "W. Bro. B.C. Connolly", honours: "PProvGStwd", progressive: false },
  { office: "Lodge Mentor", name: "W. Bro. J. Tidmarsh", honours: "", progressive: false },
  { office: "Senior Deacon", name: "Bro. R.J. Cooper", honours: "", progressive: true },
  { office: "Junior Deacon", name: "Bro. W. Burrell", honours: "", progressive: true },
  { office: "Asst. Director of Ceremonies", name: "W. Bro. J.T. Coleman", honours: "PAGSwdB / PProvGAlm", progressive: false },
  { office: "Inner Guard", name: "Bro. C. Gower", honours: "", progressive: true },
  { office: "Asst. Secretary", name: "Bro. R.J. Cooper", honours: "", progressive: false },
  { office: "Tyler", name: "W. Bro. D.J. Poole", honours: "PPSGD", progressive: false },
  { office: "Steward", name: "Bro. W. Smyth", honours: "", progressive: true },
  { office: "Steward", name: "Bro. P. Vrtak", honours: "", progressive: true },
  { office: "Steward", name: "Bro. D. Blackburn", honours: "", progressive: true },
];

const Officers = () => {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Officers of the Lodge"
          subtitle="Masonic Year 2025–2026"
        />

        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                All lodges have Officers to fill the necessary positions required to run Lodge business, the same as any organisation or committee. Some of these positions are rotated annually, while others are to do with Lodge administration or the ceremonial aspect and people tend to remain in place for a while.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed">
                Progressive offices (marked with ★) are normally taken in progression by the newer members of the Lodge, starting with Steward and then Inner Guard, Deacons, Wardens and then to Master.
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
                      <th scope="col" className="text-gold text-xs font-sans uppercase tracking-widest py-4 pr-6">Lodge Office</th>
                      <th scope="col" className="text-gold text-xs font-sans uppercase tracking-widest py-4 pr-6">Name</th>
                      <th scope="col" className="text-gold text-xs font-sans uppercase tracking-widest py-4">Honours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officers.map((o, i) => (
                      <tr key={i} className="border-b border-primary-foreground/10 hover:bg-primary-foreground/5 transition-colors">
                        <td className="text-primary-foreground font-sans text-sm py-3 pr-6">
                          {o.office} {o.progressive && <span className="text-gold">★</span>}
                        </td>
                        <td className="text-primary-foreground/80 font-sans text-sm py-3 pr-6">{o.name}</td>
                        <td className="text-primary-foreground/60 font-sans text-xs py-3">{o.honours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            <div className="text-center mt-12">
              <Link
                to="/worshipful-masters"
                className="inline-flex items-center justify-center border border-primary-foreground/30 text-primary-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
              >
                View Worshipful Masters
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Officers;
