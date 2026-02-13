import { motion } from "framer-motion";
import { Phone, Mail } from "lucide-react";

const JoinCTA = () => {
  return (
    <section id="contact" className="py-24 md:py-32 bg-navy-gradient relative overflow-hidden" aria-labelledby="join-heading">
      <div className="absolute top-0 left-0 w-64 h-64 bg-gold/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/5 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" aria-hidden="true" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
          <h2 id="join-heading" className="text-3xl md:text-4xl lg:text-5xl font-serif text-primary-foreground mb-6">
            Interested in Joining?
          </h2>
          <p className="text-primary-foreground/70 font-sans leading-relaxed mb-10 text-lg">
            Taking the first step is simple. Contact our Membership Secretary for a friendly, confidential conversation about what Freemasonry can offer you.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:07921589039"
              className="inline-flex items-center justify-center gap-3 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              <Phone className="w-4 h-4" />
              07921 589 039
            </a>
            <a
              href="mailto:secretary@weybridgelodge.org.uk"
              className="inline-flex items-center justify-center gap-3 border border-primary-foreground/30 text-primary-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
            >
              <Mail className="w-4 h-4" />
              Email Us
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default JoinCTA;
