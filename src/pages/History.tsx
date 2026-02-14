import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import vickersImg from "@/assets/history/vickers-factory.png";
import honoraryImg from "@/assets/history/honorary-members.jpg";
import foundersImg from "@/assets/history/lodge-founders.jpg";

const History = () => {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Our History"
          subtitle="Discover the history of Weybridge Lodge"
        />

        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="h-0.5 w-16 bg-gold mb-6" />
              <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-6">Weybridge Lodge Pre-History</h2>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                We begin the history of Weybridge Lodge by taking you back to the Second World War and a small village in southern England.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                Brooklands in Weybridge, Surrey was the largest aircraft manufacturing centre in Britain with Vickers-Armstrong (the third largest manufacturing employer in Britain) producing both military and civilian aircraft there. Hawker, Blériot and Martinsyde also had factories at Brooklands. The Hawker Hurricane, which was deemed instrumental to victory in the Battle of Britain, first flew at Brooklands on 6 November 1935.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed mb-6">
                The aircraft factories in the area became vital to the war effort. Despite being heavily camouflaged during World War II, the Vickers factory was bombed by the Luftwaffe on 4 September 1940 which resulted in the death of 90 aircraft workers. The Hawker factory was bombed two days later without major damage or any loss of life.
              </p>
              <figure className="my-8">
                <img
                  src={vickersImg}
                  alt="The Vickers factory in Brooklands, Weybridge, Surrey from the air in about 1939"
                  className="w-full rounded-sm"
                  loading="lazy"
                />
                <figcaption className="text-xs text-muted-foreground text-center mt-2 italic">
                  The Vickers factory from the air in about 1939. Picture courtesy of the Spirit of Brooklands Museum.
                </figcaption>
              </figure>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-navy-gradient">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-gold text-sm font-sans uppercase tracking-wide mb-2">Consecrated 29th January 1949</p>
              <h2 className="text-2xl md:text-3xl font-serif text-primary-foreground mb-6">Weybridge Lodge is Formed</h2>
              <p className="text-primary-foreground/70 font-sans leading-relaxed mb-4">
                A few years after the end of the war, staff at Vickers-Armstrong formed Weybridge Lodge. The lodge was first named in 1948 and later consecrated on 29th January 1949 when the Warrant of Constitution was issued by UGLE (the United Grand Lodge of England).
              </p>
              <p className="text-primary-foreground/70 font-sans leading-relaxed mb-4">
                Originally meeting at the Oatlands Park Hotel, Weybridge in 1948, the lodge later extended its membership from Brooklands to include the professional, business and retail community in the nearby town of Weybridge.
              </p>
              <p className="text-primary-foreground/70 font-sans leading-relaxed">
                Further expansion of the Lodge membership meant that it needed to hold its meetings in other local areas; St. George's Hill Tennis Club 1952, the Masonic Hall, Chertsey 1956, Surbiton Masonic Hall 1960 and finally to its current home at the Guildford Masonic Centre in 1986.
              </p>
              <div className="grid sm:grid-cols-2 gap-6 mt-8">
                <figure>
                  <img
                    src={honoraryImg}
                    alt="The original Honorary Members of Weybridge Lodge"
                    className="w-full rounded-sm"
                    loading="lazy"
                  />
                  <figcaption className="text-xs text-primary-foreground/50 text-center mt-2 italic">
                    The original Honorary Members of Weybridge Lodge
                  </figcaption>
                </figure>
                <figure>
                  <img
                    src={foundersImg}
                    alt="Weybridge Lodge founder members"
                    className="w-full rounded-sm"
                    loading="lazy"
                  />
                  <figcaption className="text-xs text-primary-foreground/50 text-center mt-2 italic">
                    Weybridge Lodge founder members
                  </figcaption>
                </figure>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-muted-foreground font-sans leading-relaxed mb-8">
                This has led us to a lodge with a diverse range of backgrounds, including entrepreneurs, the legal professions, IT, building trades and others from a broad range of business and commercial interests.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  to="/lodge-profile"
                  className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
                >
                  Lodge Profile
                </Link>
                <Link
                  to="/worshipful-masters"
                  className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
                >
                  Worshipful Masters
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default History;
