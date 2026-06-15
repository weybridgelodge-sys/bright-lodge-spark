import { Instagram, Facebook, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/weybridge-logo.svg";
import charterMark from "@/assets/charter-mark.png";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

const footerColumns: FooterColumn[] = [
  {
    heading: "About Us",
    links: [
      { label: "Lodge Profile", href: "/lodge-profile" },
      { label: "Our History", href: "/history" },
      { label: "Worshipful Masters", href: "/worshipful-masters" },
      { label: "Officers of the Lodge", href: "/officers" },
      { label: "Lodge Traditions", href: "/lodge-traditions" },
      { label: "Officers' Jewels", href: "/officers-jewels" },
    ],
  },
  {
    heading: "Becoming a Mason",
    links: [
      { label: "What is Freemasonry?", href: "/what-is-freemasonry" },
      { label: "Your First Visit", href: "/first-visit" },
      { label: "Your Masonic Journey", href: "/your-journey" },
      { label: "FAQ", href: "/faq" },
      { label: "Take the Quiz", href: "/quiz" },
      { label: "Join Our Lodge", href: "/join-us" },
    ],
  },
  {
    heading: "News & Media",
    links: [
      { label: "News Hub", href: "/news" },
      { label: "Events Calendar", href: "/events" },
      { label: "Bookings", href: "/bookings" },
      { label: "Ladies Festival 2026", href: "/ladies-festival" },
      { label: "Video Hub", href: "/video-hub" },
    ],
  },
  {
    heading: "Charity & More",
    links: [
      { label: "Freemasonry & Charity", href: "/freemasonry-and-charity" },
      { label: "Our Charities", href: "/our-charities" },
      { label: "Masonic Links", href: "/masonic-links" },
      { label: "Contact Us", href: "/contact" },
      { label: "Data Protection", href: "/data-protection" },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="bg-navy-dark py-16 border-t border-gold/10" role="contentinfo">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Top: brand + meeting + social */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Weybridge Lodge No. 6787 crest — Freemasons Lodge in Guildford, Surrey" width={40} height={40} loading="lazy" decoding="async" className="h-10 w-10" />
              <div>
                <p className="font-serif text-primary-foreground text-sm font-semibold">Weybridge Lodge No. 6787</p>
                <p className="text-gold text-xs font-sans">Province of Surrey</p>
              </div>
            </div>
            <p className="text-white/70 text-sm font-sans leading-relaxed mb-4">
              A Freemasons Lodge based in Guildford, Surrey. Consecrated 1949.
            </p>
            <img src={charterMark} alt="United Grand Lodge of England Charter Mark awarded to Weybridge Lodge" width={120} height={48} loading="lazy" decoding="async" className="h-12 w-auto brightness-0 invert opacity-90" />
          </div>

          <div>
            <h2 className="font-serif text-primary-foreground mb-4 text-sm">Meeting Location</h2>
            <p className="text-primary-foreground/80 text-sm font-sans leading-relaxed">
              South West Surrey Masonic Centre<br />
              Hitherbury Close<br />
              Guildford GU2 4DR
            </p>
          </div>

          <div>
            <h2 className="font-serif text-primary-foreground mb-4 text-sm">Follow Us</h2>
            <div className="flex gap-4">
              <a href="https://instagram.com/weybridgelodge/" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/80 hover:text-gold transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://facebook.com/people/Weybridge-Lodge-No-6787/61551808420513/" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/80 hover:text-gold transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://twitter.com/weybridgelodge" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/80 hover:text-gold transition-colors" aria-label="X/Twitter">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <a href="https://surreyfreemasons.org.uk/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-foreground/75 hover:text-gold transition-colors font-sans">
                Provincial Grand Lodge of Surrey
              </a>
              <a href="https://www.ugle.org.uk/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-foreground/75 hover:text-gold transition-colors font-sans">
                United Grand Lodge of England
              </a>
            </div>
          </div>
        </div>

        {/* Sitemap columns */}
        <nav aria-label="Footer sitemap" className="border-t border-gold/10 pt-10 pb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {footerColumns.map((col) => (
              <div key={col.heading}>
                <h2 className="font-serif text-primary-foreground text-sm mb-4">{col.heading}</h2>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.href}
                        className="text-xs font-sans font-light tracking-wide text-primary-foreground/80 hover:text-gold transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-gold/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-primary-foreground/75 font-sans">
            © {new Date().getFullYear()} Weybridge Lodge No. 6787. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/data-protection" className="text-xs text-primary-foreground/75 hover:text-gold transition-colors font-sans">
              Data Protection Policy
            </Link>
            <Link to="/what-is-freemasonry" className="text-xs text-primary-foreground/75 hover:text-gold transition-colors font-sans">
              What is Freemasonry
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
