import { motion } from "framer-motion";
import heroImage from "@/assets/hero-lodge.jpg";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

const PageHeader = ({ title, subtitle }: PageHeaderProps) => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
        role="img"
        aria-label="South West Surrey Masonic Centre, Guildford — meeting place of Weybridge Lodge"
      />
      <div className="absolute inset-0 bg-navy-gradient opacity-90" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-primary-foreground leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-primary-foreground/70 font-sans mt-4 max-w-xl mx-auto text-lg">
              {subtitle}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default PageHeader;
