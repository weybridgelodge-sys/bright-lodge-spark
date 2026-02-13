import { useState, useRef, useEffect } from "react";
import { Menu, X, Phone, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/weybridge-logo.svg";

interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: "About Us",
    href: "/#about",
    children: [
      { label: "Lodge Profile", href: "/lodge-profile" },
      { label: "Our History", href: "/history" },
      { label: "Worshipful Masters", href: "/worshipful-masters" },
      { label: "Officers of the Lodge", href: "/officers" },
      { label: "Masonic Links", href: "/masonic-links" },
    ],
  },
  { label: "Join Our Lodge", href: "/join-us" },
  {
    label: "Discover Freemasonry",
    href: "/what-is-freemasonry",
    children: [
      { label: "What is Freemasonry", href: "/what-is-freemasonry" },
      { label: "FAQ", href: "/faq" },
      { label: "Video Hub", href: "/video-hub" },
    ],
  },
  {
    label: "Charity",
    href: "/freemasonry-and-charity",
    children: [
      { label: "Freemasonry & Charity", href: "/freemasonry-and-charity" },
      { label: "Our Charities", href: "/our-charities" },
    ],
  },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
];

const DropdownMenu = ({ item }: { item: NavItem }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleParentClick = (e: React.MouseEvent) => {
    if (item.href.startsWith("/#")) {
      e.preventDefault();
      if (location.pathname === "/") {
        const id = item.href.slice(2);
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1 text-sm font-sans text-primary-foreground/80 hover:text-gold transition-colors duration-300 tracking-wide uppercase"
      >
        {item.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            onMouseLeave={() => setOpen(false)}
            role="menu"
            className="absolute top-full left-0 mt-2 w-56 bg-navy-dark border border-gold/15 rounded-sm shadow-xl z-50"
          >
            {item.children!.map((child) => (
              <Link
                key={child.label}
                to={child.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-5 py-3 text-sm font-sans text-primary-foreground/70 hover:text-gold hover:bg-navy-light/30 transition-colors"
              >
                {child.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
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

  const renderMobileItem = (item: NavItem) => {
    if (item.children) {
      const isExpanded = mobileExpanded === item.label;
      return (
        <div key={item.label}>
          <button
            onClick={() => setMobileExpanded(isExpanded ? null : item.label)}
            aria-expanded={isExpanded}
            className="flex items-center justify-between w-full text-sm font-sans text-primary-foreground/80 hover:text-gold transition-colors uppercase tracking-wide py-2"
          >
            {item.label}
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden pl-4 border-l border-gold/20"
              >
                {item.children.map((child) => (
                  <Link
                    key={child.label}
                    to={child.href}
                    onClick={() => setMobileOpen(false)}
                    className="block text-sm font-sans text-primary-foreground/60 hover:text-gold transition-colors py-2"
                  >
                    {child.label}
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

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
            className="text-sm font-sans text-primary-foreground/80 hover:text-gold transition-colors uppercase tracking-wide py-2 block"
          >
            {item.label}
          </a>
        );
      }
      return (
        <Link key={item.label} to={item.href} onClick={() => setMobileOpen(false)} className="text-sm font-sans text-primary-foreground/80 hover:text-gold transition-colors uppercase tracking-wide py-2 block">
          {item.label}
        </Link>
      );
    }

    return (
      <Link
        key={item.label}
        to={item.href}
        onClick={() => setMobileOpen(false)}
        className="text-sm font-sans text-primary-foreground/80 hover:text-gold transition-colors uppercase tracking-wide py-2 block"
      >
        {item.label}
      </Link>
    );
  };

  const renderDesktopItem = (item: NavItem) => {
    if (item.children) {
      return <DropdownMenu key={item.label} item={item} />;
    }

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
            className="text-sm font-sans text-primary-foreground/80 hover:text-gold transition-colors duration-300 tracking-wide uppercase"
          >
            {item.label}
          </a>
        );
      }
      return (
        <Link key={item.label} to={item.href} className="text-sm font-sans text-primary-foreground/80 hover:text-gold transition-colors duration-300 tracking-wide uppercase">
          {item.label}
        </Link>
      );
    }

    return (
      <Link
        key={item.label}
        to={item.href}
        className="text-sm font-sans text-primary-foreground/80 hover:text-gold transition-colors duration-300 tracking-wide uppercase"
      >
        {item.label}
      </Link>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-navy/95 backdrop-blur-md border-b border-gold/20">
      <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between h-16 md:h-20">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Weybridge Lodge" className="h-10 w-10 md:h-12 md:w-12" />
          <div className="hidden sm:block">
            <p className="font-serif text-primary-foreground text-sm md:text-base font-semibold leading-tight">Weybridge Lodge</p>
            <p className="text-gold text-xs">No. 6787</p>
          </div>
        </Link>

        <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-7">
          {navItems.map((item) => renderDesktopItem(item))}
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
            <nav aria-label="Mobile navigation" className="flex flex-col px-6 py-4 gap-2">
              {navItems.map((item) => renderMobileItem(item))}
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
