import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Phone, Mail, ArrowRight } from "lucide-react";

const JoinCTA = () => (
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
        <div className="h-0.5 w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
        <h2 id="join-heading" className="text-3xl md:text-4xl lg:text-5xl font-serif text-primary-foreground mb-6">
          Interested in Joining Freemasons in Guildford?
        </h2>
        <p className="text-primary-foreground/70 font-sans leading-relaxed mb-10 text-lg">
          Taking the first step is simple. Talk to our Membership Secretary for a friendly, confidential conversation about what Freemasonry can offer you. Meetings are held at Guildford Masonic Centre, GU2 4DR.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/join-us"
            className="inline-flex items-center justify-center gap-3 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
          >
            Enquire About Joining
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <a
            href="mailto:secretary@weybridgelodge.org.uk?subject=Weybridge%20Lodge%20Membership%20Enquiry"
            className="inline-flex items-center justify-center gap-3 border border-primary-foreground/30 text-primary-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors min-h-[48px] w-full sm:w-auto"
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            Email Us
          </a>
          <a
            href="tel:+447921589039"
            className="inline-flex items-center justify-center gap-3 border border-primary-foreground/30 text-primary-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors min-h-[48px] w-full sm:w-auto"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            07921 589 039
          </a>
        </div>

        <p className="mt-8 text-sm font-sans text-primary-foreground/60">
          Not sure yet?{" "}
          <Link to="/quiz" className="text-gold underline underline-offset-4 inline-block py-2">
            Take the 2-minute quiz
          </Link>
        </p>
      </motion.div>
    </div>
  </section>
);

export default JoinCTA;
