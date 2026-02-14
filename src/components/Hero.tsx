import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-lodge.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-start overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
        role="img"
        aria-label="Weybridge Lodge building exterior"
      />
      <div className="absolute inset-0 hero-overlay" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "80px" }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-0.5 bg-gold mb-8"
          />
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-primary-foreground leading-tight mb-6">
            Weybridge Lodge
            <span className="block text-gradient-gold text-2xl sm:text-3xl md:text-4xl mt-2">
              No. 6787
            </span>
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 font-sans font-light leading-relaxed mb-10 max-w-xl">
            An open, friendly and sociable Freemasons Lodge within the Province of Surrey, based in the heart of Guildford.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/join-us"
              className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Begin Your Journey
            </Link>
            <a
              href="#about"
              className="inline-flex items-center justify-center border border-primary-foreground/30 text-primary-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
            >
              Discover More
            </a>
          </div>
        </motion.div>
      </div>

      <motion.a
        href="#about"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-primary-foreground/60 hover:text-gold transition-colors"
        aria-label="Scroll to About section"
      >
        <ChevronDown className="w-8 h-8 animate-bounce" aria-hidden="true" />
      </motion.a>
    </section>
  );
};

export default Hero;
