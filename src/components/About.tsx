import { motion } from "framer-motion";
import emblem from "@/assets/masonic-emblem.png";

const About = () => {
  return (
    <section id="about" className="py-24 md:py-32 bg-warm-white">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="h-0.5 w-16 bg-gold mb-6" />
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-6 leading-tight">
              Welcome to <br />
              <span className="text-gold-dark">Weybridge Lodge</span>
            </h2>
            <p className="text-muted-foreground font-sans leading-relaxed mb-6">
              Freemasonry helps men become better people through friendship, harmony and community involvement. Weybridge Lodge No. 6787 has been proudly serving the Guildford community since 1949.
            </p>
            <p className="text-muted-foreground font-sans leading-relaxed mb-6">
              We hope that through this website, you learn a little about Freemasonry, our Lodge in particular, and how this worldwide organisation can make a difference to you and your community.
            </p>
            <p className="text-muted-foreground font-sans leading-relaxed">
              If you have any questions or are interested in taking your first step into Freemasonry, please feel free to contact us. We warmly welcome prospective candidates from all walks of life.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="w-72 h-72 md:w-96 md:h-96 rounded-full bg-navy/5 flex items-center justify-center">
                <div className="w-60 h-60 md:w-80 md:h-80 rounded-full border-2 border-gold/30 flex items-center justify-center">
                  <img
                    src={emblem}
                    alt="Masonic Square and Compasses"
                    className="w-40 h-40 md:w-52 md:h-52 object-contain"
                  />
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gold/10 rounded-full blur-2xl" />
              <div className="absolute -top-4 -left-4 w-32 h-32 bg-navy/5 rounded-full blur-2xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
