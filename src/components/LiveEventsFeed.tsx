import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { getUpcoming, typeLabel, typeBadgeClass } from "@/data/events";

const LiveEventsFeed = () => {
  const upcoming = getUpcoming(4);

  return (
    <section className="py-16 sm:py-20 md:py-28 bg-warm-white">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10"
        >
          <div>
            <div className="h-0.5 w-16 bg-gold mb-6" />
            <h2 className="text-3xl md:text-4xl font-serif text-foreground">What's Coming Up</h2>
            <p className="text-muted-foreground font-sans mt-2">
              A live feed of our next ceremonies, social evenings and Lodge of Instruction.
            </p>
          </div>
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-sm font-sans font-medium text-gold hover:opacity-80 transition-opacity"
          >
            View full calendar
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {upcoming.map((ev, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-card border border-border rounded-sm shadow-sm overflow-hidden flex flex-col"
            >
              <div className="bg-navy-gradient text-primary-foreground p-5">
                <p className="text-gold text-xs uppercase tracking-widest font-sans">
                  {format(ev.date, "MMM")}
                </p>
                <p className="text-4xl font-serif leading-none mt-1">{format(ev.date, "d")}</p>
                <p className="text-primary-foreground/60 text-xs font-sans mt-1">
                  {format(ev.date, "EEEE")}
                </p>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <span className={`self-start text-[10px] uppercase tracking-widest font-sans px-2 py-0.5 rounded-full mb-3 ${typeBadgeClass[ev.type]}`}>
                  {typeLabel[ev.type]}
                </span>
                <h3 className="font-serif text-foreground text-lg mb-2 leading-snug">{ev.title}</h3>
                <p className="text-xs text-muted-foreground font-sans flex items-start gap-1.5 mb-4">
                  <MapPin className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
                  {ev.venue}
                </p>
                <Link
                  to={ev.link ?? "/events"}
                  className="mt-auto inline-flex items-center gap-1 text-xs font-sans font-medium text-gold hover:opacity-80 transition-opacity"
                >
                  Details <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LiveEventsFeed;
