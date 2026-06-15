import { motion } from "framer-motion";
import { Calendar, MapPin, Clock } from "lucide-react";

const NextMeeting = () => {
  return (
    <section id="meeting" className="py-24 md:py-32 bg-warm-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-4">
            Our Next Meeting
          </h2>
          <p className="text-muted-foreground font-sans mb-12">
            You are warmly invited to attend
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-2xl mx-auto bg-card rounded-sm border border-border shadow-lg overflow-hidden"
        >
          <div className="bg-navy-gradient p-8 text-center">
            <p className="text-gold uppercase tracking-widest text-sm font-sans mb-2">Super Saturday Triple Passing</p>
            <p className="text-3xl md:text-4xl font-serif text-primary-foreground">
              12th September 2026
            </p>
            <p className="text-primary-foreground/60 font-sans text-sm mt-2">
              September Meeting
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex items-start gap-4">
              <MapPin className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-sans font-medium text-foreground">South West Surrey Masonic Centre</p>
                <p className="text-sm text-muted-foreground font-sans">Hitherbury Close, Guildford GU2 4DR</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Calendar className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-sans font-medium text-foreground">Saturday, 12 September 2026, 11 am</p>
                <p className="text-sm text-muted-foreground font-sans">Now open for bookings</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Clock className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-sans font-medium text-foreground">Followed by a Festive Board lunch</p>
                <p className="text-sm text-muted-foreground font-sans">Contact us to book your place</p>
              </div>
            </div>

            <a
              href="/bookings"
              className="block w-full text-center bg-gold-shimmer text-accent-foreground py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity mt-4"
            >
              Book Your Place
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default NextMeeting;
