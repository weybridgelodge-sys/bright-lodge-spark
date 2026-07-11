import { Instagram, Facebook, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import logoAsset from "@/assets/weybridge-logo-96.webp.asset.json";
const logo = logoAsset.url;
import charterMark from "@/assets/charter-mark.png";
import NewsletterSignup from "@/components/NewsletterSignup";

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
      { label: "Officers' Roles & Jewels", href: "/officers-jewels" },
      // NEW — mirrors the header's "Local Area" addition
      { label: "South Surrey Freemasons", href: "/south-surrey-freemasons" },
    ],
  },
  {
    heading: "Becoming a Mason",
    links: [
      { label: "What is Freemasonry?", href: "/what-is-freemasonry" },
      { label: "Your Initiation Night", href: "/first-visit" },
      { label: "Your Masonic Journey", href: "/your-journey" },
      { label: "FAQ", href: "/faq" },
      { label: "Take the Quiz", href: "/quiz" },
      { label: "Join Our Lodge", href: "/join-us" },
    ],
  },
  {
    heading: "Meetings & Events",
    links: [
      { label: "Book Into Our Next Meeting", href: "/bookings" },
      { label: "Events Calendar", href: "/events" },
      { label: "Ladies Festival August 2026", href: "/ladies-festival" },
    ],
  },
  {
    heading: "News & Media",
    links: [
      { label: "News Hub", href: "/news" },
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
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-12 mb-12 items-start">
          <div className="relative text-left pr-14">
            <img src={logo} alt="Weybridge Lodge No. 6787 crest — Freemasons Lodge in Guildford, Surrey" width={40} height={40} loading="lazy" decoding="async" className="absolute right-0 top-0 h-10 w-10" />
            <p className="font-serif text-primary-foreground text-sm font-semibold">Weybridge Lodge No. 6787</p>
            <p className="text-gold text-xs font-sans mb-3">Province of Surrey</p>
            <p className="text-white/70 text-sm font-sans leading-relaxed mb-4">
              A Freemasons Lodge in Guildford, Surrey. Consecrated 1949.
            </p>
            <img src={charterMark} alt="United Grand Lodge of England Charter Mark awarded to Weybridge Lodge" width={270} height={108} loading="lazy" decoding="async" className="h-24 w-auto brightness-0 invert opacity-95" />
          </div>

          <div>
            <h2 className="font-serif text-primary-foreground mb-4 text-sm">Meeting Location</h2>
            <p className="text-primary-foreground/80 text-sm font-sans leading-relaxed">
              Guildford Masonic Centre, Weybourne House,<br />
              Hitherbury Close,<br />
              Guildford, Surrey GU2 4DR
            </p>
          </div>

          <div>
            <h2 className="font-serif text-primary-foreground mb-4 text-sm">Follow Us</h2>
            <div className="flex gap-2">
              <a
                href="https://instagram.com/weybridgelodge/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-gold transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com/people/Weybridge-Lodge-No-6787/61551808420513/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-gold transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com/weybridgelodge"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-gold transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                aria-label="X/Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <a href="https://surreyfreemasons.org.uk/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-foreground/75 hover:text-gold transition-colors font-sans min-h-[48px] inline-flex items-center">
                Provincial Grand Lodge of Surrey
              </a>
              <a href="https://www.ugle.org.uk/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-foreground/75 hover:text-gold transition-colors font-sans min-h-[48px] inline-flex items-center">
                United Grand Lodge of England
              </a>
            </div>
          </div>
        </div>

        {/* Newsletter signup */}
        <div className="border-t border-gold/10 pt-10 grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 max-w-md">
            <NewsletterSignup />
          </div>
        </div>



        {/* Sitemap columns */}
        <nav aria-label="Footer sitemap" className="border-t border-gold/10 pt-10 pb-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {footerColumns.map((col) => (
              <div key={col.heading} className="text-left">
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
          <div className="text-center sm:text-left">
            <p className="text-xs text-primary-foreground/75 font-sans">
              © {new Date().getFullYear()} Weybridge Lodge No. 6787. All rights reserved.
            </p>
            <p className="text-xs text-primary-foreground/75 font-sans mt-1">
              ICO Registration: ZC194126
            </p>
          </div>
          <div className="flex gap-6">
            <Link to="/data-protection" className="text-xs text-primary-foreground/75 hover:text-gold transition-colors font-sans min-h-[48px] inline-flex items-center">
              Data Protection Policy
            </Link>
            <Link to="/accessibility-statement" className="text-xs text-primary-foreground/75 hover:text-gold transition-colors font-sans min-h-[48px] inline-flex items-center">
              Accessibility Statement
            </Link>
            <Link to="/what-is-freemasonry" className="text-xs text-primary-foreground/75 hover:text-gold transition-colors font-sans min-h-[48px] inline-flex items-center">
              What is Freemasonry
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
