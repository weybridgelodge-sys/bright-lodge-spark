import { useState, useRef, useEffect } from "react";
import { Menu, X, Phone, ChevronDown, Mail, Lock } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import logoAsset from "@/assets/weybridge-logo-no-bg.png.asset.json";
const logo = logoAsset.url;


interface NavChild {
  label: string;
  href: string;
  badge?: string;
  accent?: boolean;
}

interface NavSection {
  heading?: string;
  items: NavChild[];
}

interface NavItem {
  label: string;
  href: string;
  sections?: NavSection[];
}

const navItems: NavItem[] = [
  {
    label: "About Us",
    href: "/lodge-profile",
    sections: [
      {
        items: [
          { label: "Lodge Profile", href: "/lodge-profile" },
          { label: "Our History", href: "/history" },
          { label: "Worshipful Masters", href: "/worshipful-masters" },
          { label: "Officers of the Lodge", href: "/officers" },
        ],
      },
      {
        heading: "Deep Dive",
        items: [
          { label: "Lodge Traditions", href: "/lodge-traditions" },
          { label: "Officers' Roles & Jewels", href: "/officers-jewels" },
        ],
      },
    ],
  },
  {
    label: "Becoming a Mason",
    href: "/join-us",
    sections: [
      {
        heading: "Your Journey",
        items: [
          { label: "What is Freemasonry?", href: "/what-is-freemasonry" },
          { label: "Your First Visit", href: "/first-visit" },
          { label: "Your Masonic Journey", href: "/your-journey" },
          { label: "FAQ", href: "/faq" },
        ],
      },
      {
        heading: "Interactive",
        items: [
          { label: "Is it for me? Take the Quiz", href: "/quiz", badge: "2 min", accent: true },
          { label: "Join Our Lodge", href: "/join-us", accent: true },
        ],
      },
    ],
  },
  {
    label: "Meetings & Events",
    href: "/bookings",
    sections: [
      {
        items: [
          { label: "Book Into Our Next Meeting", href: "/bookings", accent: true },
          { label: "Events Calendar", href: "/events" },
          { label: "Ladies Festival August 2026", href: "/ladies-festival", accent: true },
        ],
      },
    ],
  },
  {
    label: "News & Media",
    href: "/news",
    sections: [
      {
        items: [
          { label: "News Hub", href: "/news" },
          { label: "Video Hub", href: "/video-hub" },
        ],
      },
    ],
  },

  {
    label: "Charity",
    href: "/freemasonry-and-charity",
    sections: [
      {
        items: [
          { label: "Freemasonry & Charity", href: "/freemasonry-and-charity" },
          { label: "Our Charities", href: "/our-charities" },
        ],
      },
    ],
  },
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
      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          role="menu"
          className="absolute top-full left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-navy-dark border border-gold/15 rounded-sm shadow-xl z-50 py-3 before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0 before:h-2 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {item.sections!.map((section, sIdx) => (
            <div key={sIdx} className={sIdx > 0 ? "mt-2 pt-3 border-t border-gold/10" : ""}>
              {section.heading && (
                <div className="px-5 pb-2 text-[10px] font-sans uppercase tracking-[0.18em] text-gold/60">
                  {section.heading}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((child) => (
                  <Link
                    key={child.label}
                    to={child.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between gap-2 px-5 py-2.5 text-sm font-sans font-light tracking-wide transition-colors ${
                      child.accent
                        ? "text-gold hover:bg-gold/10"
                        : "text-primary-foreground/70 hover:text-gold hover:bg-navy-light/30"
                    }`}
                  >
                    <span>{child.label}</span>
                    {child.badge && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-gold/15 text-gold px-2 py-0.5 rounded-full">
                        {child.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!mobileOpen) setMobileExpanded(null);
  }, [mobileOpen]);

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
    if (item.sections) {
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
          {isExpanded && (
            <div className="overflow-hidden pl-4 border-l border-gold/20 animate-in fade-in slide-in-from-top-1 duration-150">
              {item.sections.map((section, sIdx) => (
                <div key={sIdx} className={sIdx > 0 ? "mt-2 pt-2 border-t border-gold/10" : ""}>
                  {section.heading && (
                    <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-gold/60 py-1.5">
                      {section.heading}
                    </div>
                  )}
                  {section.items.map((child) => (
                    <Link
                      key={child.label}
                      to={child.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between gap-2 text-sm font-sans py-2 transition-colors ${
                        child.accent ? "text-gold" : "text-primary-foreground/60 hover:text-gold"
                      }`}
                    >
                      <span>{child.label}</span>
                      {child.badge && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-gold/15 text-gold px-2 py-0.5 rounded-full">
                          {child.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}

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
    if (item.sections) {
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
          <img src={logo} alt="Weybridge Lodge No. 6787 crest — Freemasons Lodge in Guildford, Surrey" width={48} height={48} decoding="async" className="h-10 w-10 md:h-12 md:w-12 bg-primary-foreground/80 rounded-full p-0.5" />
          <div className="hidden sm:block">
            <p className="font-serif text-primary-foreground text-sm md:text-base font-semibold leading-tight">Weybridge Lodge</p>
            <p className="text-gold text-xs">No. 6787</p>
          </div>
        </Link>

        <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-7">
          {navItems.map((item) => renderDesktopItem(item))}
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <Link
            to="/members"
            className="hidden md:inline-flex items-center gap-1.5 text-xs text-primary-foreground/70 hover:text-gold transition-colors uppercase tracking-wide"
            title="Members Portal"
          >
            <Lock className="w-3.5 h-3.5" />
            Members
          </Link>
          <Link
            to="/contact"
            className="hidden md:inline-flex items-center gap-2 border border-gold/50 text-gold px-4 py-2 rounded-sm text-sm font-semibold font-sans hover:bg-gold/10 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact
          </Link>
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

      {mobileOpen && (
        <div className="lg:hidden bg-navy-dark border-t border-gold/10 max-h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <nav aria-label="Mobile navigation" className="flex flex-col px-6 py-4 gap-2">
            {navItems.map((item) => renderMobileItem(item))}
            <Link
              to="/contact"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 border border-gold/50 text-gold px-5 py-3 rounded-sm text-sm font-semibold font-sans mt-2"
            >
              <Mail className="w-4 h-4" />
              Contact Us
            </Link>
            <Link
              to="/join-us"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-5 py-3 rounded-sm text-sm font-semibold font-sans"
            >
              <Phone className="w-4 h-4" />
              Interested in Joining?
            </Link>
            <Link
              to="/members"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 text-xs text-primary-foreground/70 hover:text-gold uppercase tracking-wider py-2"
            >
              <Lock className="w-3.5 h-3.5" /> Members Portal
            </Link>
          </nav>
        </div>
      )}

    </header>
  );
};

export default Header;
