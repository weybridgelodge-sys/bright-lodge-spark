import { motion } from "framer-motion";
import { Quote } from "lucide-react";

// NOTE: Placeholder quotes for layout/design only.
// Replace `quote`, `name`, `role` and `joined` with real member testimonials when available.
const testimonials = [
  {
    quote:
      "I'd always been curious but assumed it wasn't for someone like me. Three years in, it's the best decision I've made — proper friendships and a genuine sense of purpose.",
    name: "[Member Name]",
    role: "Joined aged 34",
    joined: "Member since 2022",
  },
  {
    quote:
      "What surprised me most was how normal everyone was. No secret handshakes on day one, no pressure — just a good meal and good company. I felt at home from the first visit.",
    name: "[Member Name]",
    role: "Joined aged 41",
    joined: "Member since 2020",
  },
  {
    quote:
      "I joined later in life thinking I'd missed the boat. The Lodge welcomed me like I'd always been part of it. The charity work alone has made it worthwhile.",
    name: "[Member Name]",
    role: "Joined aged 58",
    joined: "Member since 2019",
  },
];

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
