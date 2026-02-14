import { motion } from "framer-motion";
import { Heart, Users, Shield, HandHelping } from "lucide-react";
import { Link } from "react-router-dom";

const principles = [
  {
    icon: Shield,
    title: "Integrity",
    description: "Building lives of honesty and high moral standards, guided by conscience and good character.",
  },
  {
    icon: Users,
    title: "Friendship",
    description: "Fostering genuine bonds of brotherhood that transcend social and cultural boundaries.",
  },
  {
    icon: Heart,
    title: "Respect",
    description: "Treating every individual with dignity, valuing diverse perspectives and open-mindedness.",
  },
  {
    icon: HandHelping,
    title: "Service",
    description: "Contributing to society through charitable works and active community involvement.",
  },
];

const Principles = () => {
  return (
    <section id="principles" className="py-24 md:py-32 bg-navy-gradient">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-primary-foreground mb-4">
            The Four Guiding Principles
          </h2>
          <p className="text-primary-foreground/60 font-sans max-w-xl mx-auto">
            The foundation upon which every Freemason builds their journey
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {principles.map((principle, index) => (
            <motion.div
              key={principle.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <Link
                to={`/what-is-freemasonry#${principle.title.toLowerCase()}`}
                className="group block text-center p-8 rounded-sm border border-gold/10 hover:border-gold/30 transition-all duration-500 bg-navy-light/30 h-full"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-gold/30 mb-6 group-hover:bg-gold/10 transition-colors duration-500">
                  <principle.icon className="w-7 h-7 text-gold" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-serif text-primary-foreground mb-3">
                  {principle.title}
                </h3>
                <p className="text-sm text-primary-foreground/60 font-sans leading-relaxed">
                  {principle.description}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Principles;
