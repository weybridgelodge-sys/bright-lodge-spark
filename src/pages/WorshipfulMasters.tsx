import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const masters = [
  { year: "1949", name: "Roy Edmonds", honours: "MBE, PPGD" },
  { year: "1949", name: "F.W. Poulter", honours: "" },
  { year: "1950", name: "E.G. Stacey", honours: "" },
  { year: "1951", name: "L. Lake", honours: "" },
  { year: "1952", name: "F.T. Butt", honours: "PPAGDC" },
  { year: "1953", name: "L.T. Anstead", honours: "" },
  { year: "1954", name: "H.E. Boyle", honours: "" },
  { year: "1955", name: "G.H Knevett", honours: "" },
  { year: "1956", name: "A.J. Huntingford", honours: "" },
  { year: "1957", name: "F.A. Edmonds", honours: "" },
  { year: "1958", name: "R.G. Batten", honours: "" },
  { year: "1959", name: "W.J. Green", honours: "PPGD" },
  { year: "1960", name: "H. Cohen", honours: "" },
  { year: "1961", name: "J. Humphries", honours: "" },
  { year: "1962", name: "G.N. Mills", honours: "PPGStwd" },
  { year: "1963", name: "V.E. Wick", honours: "" },
  { year: "1964", name: "E.F.G. Hills", honours: "" },
  { year: "1965", name: "S.C. Turner", honours: "" },
  { year: "1966", name: "George Kenyon", honours: "" },
  { year: "1967", name: "S.L. Mullins", honours: "" },
  { year: "1968", name: "H.R. Holyer", honours: "" },
  { year: "1969", name: "H.E. Gibbs", honours: "" },
  { year: "1970", name: "G.S. Turner", honours: "" },
  { year: "1971", name: "J.A. Yates", honours: "" },
  { year: "1972", name: "E.W.J. Aldridge", honours: "" },
  { year: "1973", name: "C. Crook", honours: "" },
  { year: "1974", name: "J.A. Ladd", honours: "" },
  { year: "1975", name: "T.W. Laffey", honours: "" },
  { year: "1976", name: "A.M. Forsyth", honours: "" },
  { year: "1977", name: "J.W. Roach", honours: "" },
  { year: "1978", name: "E.W.C. Eke", honours: "" },
  { year: "1979", name: "R.H. Kidman", honours: "" },
  { year: "1980", name: "Reginald J Rattle", honours: "" },
  { year: "1981", name: "R.G. Studart", honours: "" },
  { year: "1982", name: "W.C. Brown", honours: "" },
  { year: "1983", name: "T.H. Pitts", honours: "" },
  { year: "1984", name: "K.J. Pullen", honours: "" },
  { year: "1985", name: "A.C. Carter", honours: "" },
  { year: "1986", name: "A.R. Godfrey", honours: "" },
  { year: "1987", name: "Kenneth R Stennett", honours: "PPGReg" },
  { year: "1988", name: "George Kenyon", honours: "PPJGW" },
  { year: "1989", name: "G.F.M. Hawkims", honours: "SLGR" },
  { year: "1990", name: "L.C. Bartley", honours: "" },
  { year: "1991", name: "Roger C Curtis", honours: "PPGSuptWks / PPDGReg / PAGS" },
  { year: "1992", name: "D.A. Taylor", honours: "" },
  { year: "1993", name: "M.E. Head", honours: "" },
  { year: "1994", name: "J.R. Coles", honours: "" },
  { year: "1995", name: "R.M. Shapley", honours: "" },
  { year: "1996", name: "D.A. Taylor", honours: "" },
  { year: "1997", name: "John T Coleman", honours: "ProvGAlm / PAGSwdB" },
  { year: "1998", name: "John V C French", honours: "PPGSwdB" },
  { year: "1999", name: "G.F.M. Hawkims", honours: "SLGR" },
  { year: "2000", name: "Roger C Curtis", honours: "PPGSuptWks / PPDGReg / PAGS" },
  { year: "2001", name: "Roger C Curtis", honours: "PPGSuptWks / PPDGReg / PAGS" },
  { year: "2002", name: "Adam G Dyne", honours: "" },
  { year: "2003", name: "Kevin P Brennan", honours: "PPGSuptWks" },
  { year: "2004", name: "William S Stacey", honours: "PPJGD" },
  { year: "2005", name: "Jeffrey M Marlow", honours: "PPAGReg" },
  { year: "2006", name: "John V C French", honours: "PPGSwdB" },
  { year: "2007", name: "John R Franks", honours: "PPDGReg" },
  { year: "2008", name: "David J Poole", honours: "PPSGD" },
  { year: "2009", name: "John T Coleman", honours: "ProvGAlm / PAGSwdB" },
  { year: "2010", name: "Anthony J Mallard", honours: "MBE / PPAGDC" },
  { year: "2011", name: "Stephen J Chamberlain", honours: "" },
  { year: "2012", name: "Chris G Burgess", honours: "PPAGReg" },
  { year: "2013", name: "B L Langhorn", honours: "" },
  { year: "2014", name: "A R Calvert", honours: "" },
  { year: "2015", name: "Scott J Gibson", honours: "" },
  { year: "2016", name: "Richard D Smith", honours: "PPAGSwdB" },
  { year: "2017", name: "Jonathon G Scott", honours: "PPAGDC" },
  { year: "2018", name: "Ben C Connolly", honours: "PProvGStwd" },
  { year: "2019", name: "Ben C Connolly", honours: "PProvGStwd" },
  { year: "2020", name: "Ben C Connolly", honours: "PProvGStwd" },
  { year: "2021", name: "Kenneth N Holdsworth", honours: "" },
  { year: "2022", name: "Richard D Smith", honours: "PPAGSwdB" },
  { year: "2023", name: "Murray J Grubb Jnr", honours: "" },
  { year: "2024", name: "Murray J Grubb Jnr", honours: "" },
  { year: "2025", name: "Julien P Tidmarsh", honours: "" },
];

const WorshipfulMasters = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
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
              className="overflow-x-auto"
            >
              <div className="bg-primary-foreground/5 border border-gold/20 rounded-sm p-6 md:p-8 backdrop-blur-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gold/30">
                      <th className="text-gold text-xs font-sans uppercase tracking-widest py-4 pr-6">Year</th>
                      <th className="text-gold text-xs font-sans uppercase tracking-widest py-4 pr-6">Name</th>
                      <th className="text-gold text-xs font-sans uppercase tracking-widest py-4">Honours</th>
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
