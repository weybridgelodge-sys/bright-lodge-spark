import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { testimonials } from "@/data/testimonials";
// To add real quotes, edit src/data/testimonials.ts or run
// `node scripts/import-testimonials.mjs scripts/testimonials.csv`
// See scripts/TESTIMONIALS_GUIDE.md for the collection workflow.

const Testimonials = () => {
  return (
    <section className="py-16 sm:py-24 bg-warm-white">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
            In our members' own words
          </h2>
          <p className="text-muted-foreground font-sans max-w-xl mx-auto">
            From men who once stood exactly where you are now.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((t, i) => (
            <motion.figure
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-card border border-border rounded-sm p-6 sm:p-8 shadow-sm flex flex-col"
            >
              <Quote className="w-8 h-8 text-gold/60 mb-4" aria-hidden="true" />
              <blockquote className="text-foreground font-serif text-base leading-relaxed flex-1">
                "{t.quote}"
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-border">
                <p className="font-sans font-semibold text-foreground text-sm">{t.name}</p>
                <p className="font-sans text-muted-foreground text-xs mt-0.5">{t.role}</p>
                <p className="font-sans text-gold text-xs mt-0.5 uppercase tracking-wider">{t.joined}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
