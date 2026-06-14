import { motion } from "framer-motion";
import { useState } from "react";

interface TimelineEntry {
  year: string;
  title: string;
  description: string;
}

const milestones: TimelineEntry[] = [
  {
    year: "1944",
    title: "Wartime Roots at Brooklands",
    description:
      "The seeds of the Lodge are sown amongst Vickers-Armstrong aircraft workers at Brooklands during the Second World War.",
  },
  {
    year: "1949",
    title: "Lodge Consecrated",
    description:
      "Weybridge Lodge No. 6787 is officially consecrated, becoming a new home for Freemasonry in Surrey.",
  },
  {
    year: "1960s",
    title: "Move to Guildford",
    description:
      "The Lodge settles into the South West Surrey Masonic Centre in Guildford, where it still meets today.",
  },
  {
    year: "2023",
    title: "75th Anniversary Approaches",
    description:
      "Preparations begin for our 75th anniversary year, celebrating three quarters of a century of friendship and charity.",
  },
  {
    year: "2025",
    title: "Surrey 2030 Festival Gold",
    description:
      "Awarded the Surrey 2030 Festival Gold Award for outstanding charitable contribution to the Masonic Charitable Foundation.",
  },
  {
    year: "2026",
    title: "Ladies Festival Gala",
    description:
      "Joint Ladies Festival with Astolat Lodge at Macdonald Frimley Hall in aid of Guildford Young Carers.",
  },
];

const LodgeTimeline = () => {
  const [active, setActive] = useState(0);

  return (
    <section className="py-20 md:py-28 bg-navy-gradient text-primary-foreground">
      <div className="container mx-auto px-6 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-serif mb-3">Our Journey Through Time</h2>
          <p className="text-primary-foreground/70 font-sans max-w-2xl mx-auto">
            From wartime Brooklands to a thriving Guildford Lodge — explore the milestones that have shaped Weybridge Lodge No. 6787.
          </p>
        </motion.div>

        {/* Timeline rail */}
        <div className="relative">
          <div className="absolute left-0 right-0 top-7 h-px bg-gold/30 hidden md:block" />
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 relative">
            {milestones.map((m, i) => (
              <button
                key={m.year}
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                className="flex flex-col items-center text-center group focus:outline-none"
                aria-label={`View milestone: ${m.year} ${m.title}`}
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    i === active
                      ? "bg-gold border-gold scale-125 shadow-[0_0_12px_hsl(var(--accent))]"
                      : "bg-navy-dark border-gold/40 group-hover:border-gold"
                  }`}
                />
                <span
                  className={`mt-3 font-serif text-sm md:text-base transition-colors ${
                    i === active ? "text-gold" : "text-primary-foreground/60 group-hover:text-primary-foreground"
                  }`}
                >
                  {m.year}
                </span>
              </button>
            ))}
          </div>

          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-10 max-w-2xl mx-auto bg-navy-dark/60 border border-gold/20 rounded-sm p-6 md:p-8 text-center"
          >
            <p className="text-gold uppercase tracking-widest text-xs font-sans mb-2">
              {milestones[active].year}
            </p>
            <h3 className="text-2xl font-serif mb-3">{milestones[active].title}</h3>
            <p className="text-primary-foreground/80 font-sans leading-relaxed">
              {milestones[active].description}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LodgeTimeline;
