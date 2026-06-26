import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
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
      <SEO
        title="Officers of the Lodge | Masonic Year 2025–2026"
        description="Meet the officers of Weybridge Lodge No. 6787, Guildford, for the Masonic Year 2025–2026 — from Worshipful Master to Stewards, with Provincial and Grand honours shown."
        canonical="/officers"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "About Us", url: "/#about" },
          { name: "Officers", url: "/officers" },
        ])}
      />
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
              className="space-y-6"
            >
              <p className="text-muted-foreground font-sans leading-relaxed">
                Weybridge Lodge is served by a full complement of officers for the Masonic Year 2025–2026, appointed at the Installation Meeting in October 2025. Like all Masonic Lodges, our officers fill the roles necessary to conduct ceremonies, administer the Lodge, and look after the welfare of our members.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed">
                Progressive offices (marked ★) are taken in sequence by newer members of the Lodge, beginning as Steward and progressing through Inner Guard, the Deacons, and the Wardens toward the Chair of the Master. Non-progressive offices — such as Secretary, Treasurer, Director of Ceremonies, and Almoner — are typically held by experienced Past Masters, often for several years, to provide continuity and institutional knowledge.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed">
                A brother may hold more than one office in a given year, reflecting the Lodge's size and the breadth of experience among its members.
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
                    {(() => {
                      const firstProgressiveIdx = officers.findIndex((o) => o.progressive);
                      return officers.map((o, i) => {
                        const showDivider = i === firstProgressiveIdx;
                        const description =
                          o.office === "Lodge Mentor"
                            ? "Supports new members through their early Masonic journey"
                            : o.office === "Lodge Membership Officer"
                            ? "Leads the Lodge's candidate attraction and member retention programme"
                            : null;
                        return (
                          <React.Fragment key={i}>
                            {showDivider && (
                              <tr className="border-t-2 border-gold/40">
                                <td colSpan={3} className="text-gold text-[10px] font-sans uppercase tracking-[0.2em] py-3">
                                  Progressive Offices ★
                                </td>
                              </tr>
                            )}
                            <tr className="border-b border-primary-foreground/10 hover:bg-primary-foreground/5 transition-colors">
                              <td className="text-primary-foreground font-sans text-sm py-3 pr-6">
                                <div>
                                  {o.office} {o.progressive && <span className="text-gold">★</span>}
                                </div>
                                {description && (
                                  <div className="text-primary-foreground/50 font-sans text-xs italic mt-1">
                                    {description}
                                  </div>
                                )}
                              </td>
                              <td className="text-primary-foreground/80 font-sans text-sm py-3 pr-6">{o.name}</td>
                              <td className="text-primary-foreground/60 font-sans text-xs py-3">{o.honours}</td>
                            </tr>
                          </React.Fragment>

                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </motion.div>

            <p className="text-primary-foreground/85 font-sans leading-relaxed mt-12 max-w-2xl mx-auto text-center">
              The officers listed here give their time freely in service to the Lodge and to Freemasonry. If you would like to know more about what each role involves — including the journey from Steward to Worshipful Master — visit our{" "}
              <Link to="/officers-jewels" className="text-gold underline underline-offset-4 hover:text-gold/80 transition-colors">
                Officers Roles & Jewels
              </Link>
              {" "}page.
            </p>

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

