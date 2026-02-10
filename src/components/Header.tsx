import { useState } from "react";
import { Menu, X, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/weybridge-logo.svg";

const navItems = [
  { label: "About Us", href: "/#about" },
  { label: "What is Freemasonry", href: "/what-is-freemasonry" },
  { label: "Charity", href: "/freemasonry-and-charity" },
  { label: "Our Charities", href: "/our-charities" },
  { label: "Join Us", href: "/join-us" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("/#")) {
      const id = href.slice(2);
      if (location.pathname === "/") {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const renderLink = (item: typeof navItems[0], className: string) => {
    if (item.href.startsWith("/#")) {
      if (location.pathname === "/") {
        return (
          <a
            key={item.label}
            href={item.href}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick(item.href);
            }}
            className={className}
          >
            {item.label}
          </a>
        );
      }
      return (
        <Link key={item.label} to={item.href} className={className}>
          {item.label}
        </Link>
      );
    }
    return (
      <Link
        key={item.label}
        to={item.href}
        onClick={() => setMobileOpen(false)}
        className={className}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-navy/95 backdrop-blur-md border-b border-gold/20">
      <div className="container mx-auto px-6 flex items-center justify-between h-16 md:h-20">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Weybridge Lodge" className="h-10 w-10 md:h-12 md:w-12" />
          <div className="hidden sm:block">
            <p className="font-serif text-primary-foreground text-sm md:text-base font-semibold leading-tight">Weybridge Lodge</p>
            <p className="text-gold text-xs">No. 6787</p>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) =>
            renderLink(item, "text-sm font-sans text-primary-foreground/80 hover:text-gold transition-colors duration-300 tracking-wide uppercase")
          )}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            to="/join-us"
            className="hidden md:flex items-center gap-2 bg-gold-shimmer text-accent-foreground px-5 py-2.5 rounded-sm text-sm font-semibold font-sans hover:opacity-90 transition-opacity"
          >
            <Phone className="w-4 h-4" />
            Join Us
          </Link>
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
              {navItems.map((item) =>
                renderLink(item, "text-sm font-sans text-primary-foreground/80 hover:text-gold transition-colors uppercase tracking-wide py-2")
              )}
              <Link
                to="/join-us"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-5 py-3 rounded-sm text-sm font-semibold font-sans mt-2"
              >
                <Phone className="w-4 h-4" />
                Interested in Joining?
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
