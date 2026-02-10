import { useState } from "react";
import { Menu, X, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import emblem from "@/assets/masonic-emblem.png";

const navItems = [
  { label: "About Us", href: "#about" },
  { label: "Our Principles", href: "#principles" },
  { label: "Next Meeting", href: "#meeting" },
  { label: "Contact", href: "#contact" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-navy/95 backdrop-blur-md border-b border-gold/20">
      <div className="container mx-auto px-6 flex items-center justify-between h-16 md:h-20">
        <a href="#" className="flex items-center gap-3">
          <img src={emblem} alt="Weybridge Lodge" className="h-10 w-10 md:h-12 md:w-12" />
          <div className="hidden sm:block">
            <p className="font-serif text-primary-foreground text-sm md:text-base font-semibold leading-tight">Weybridge Lodge</p>
            <p className="text-gold text-xs">No. 6787</p>
          </div>
        </a>

        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-sans text-primary-foreground/80 hover:text-gold transition-colors duration-300 tracking-wide uppercase"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href="tel:07921589039"
            className="hidden md:flex items-center gap-2 bg-gold-shimmer text-accent-foreground px-5 py-2.5 rounded-sm text-sm font-semibold font-sans hover:opacity-90 transition-opacity"
          >
            <Phone className="w-4 h-4" />
            Join Us
          </a>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-primary-foreground"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden bg-navy-dark border-t border-gold/10 overflow-hidden"
          >
            <nav className="flex flex-col px-6 py-4 gap-4">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-sans text-primary-foreground/80 hover:text-gold transition-colors uppercase tracking-wide py-2"
                >
                  {item.label}
                </a>
              ))}
              <a
                href="tel:07921589039"
                className="flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-5 py-3 rounded-sm text-sm font-semibold font-sans mt-2"
              >
                <Phone className="w-4 h-4" />
                Interested in Joining? Call Now
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
