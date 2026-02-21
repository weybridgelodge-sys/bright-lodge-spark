import { Instagram, Facebook, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/weybridge-logo.svg";
import charterMark from "@/assets/charter-mark.png";

const Footer = () => {
  return (
    <footer className="bg-navy-dark py-16 border-t border-gold/10" role="contentinfo">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Weybridge Lodge No. 6787 crest — Freemasons Lodge in Guildford, Surrey" className="h-10 w-10" />
              <div>
                <p className="font-serif text-primary-foreground text-sm font-semibold">Weybridge Lodge No. 6787</p>
                <p className="text-gold text-xs font-sans">Province of Surrey</p>
              </div>
            </div>
            <p className="text-primary-foreground/50 text-sm font-sans leading-relaxed mb-4">
              A Freemasons Lodge based in Guildford, Surrey. Consecrated 1949.
            </p>
            <img src={charterMark} alt="United Grand Lodge of England Charter Mark awarded to Weybridge Lodge" className="h-12 w-auto opacity-60" />
          </div>

          <div>
            <h4 className="font-serif text-primary-foreground mb-4 text-sm">Meeting Location</h4>
            <p className="text-primary-foreground/50 text-sm font-sans leading-relaxed">
              South West Surrey Masonic Centre<br />
              Hitherbury Close<br />
              Guildford GU2 4DR
            </p>
          </div>

          <div>
            <h4 className="font-serif text-primary-foreground mb-4 text-sm">Follow Us</h4>
            <div className="flex gap-4">
              <a href="https://instagram.com/weybridgelodge/" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/50 hover:text-gold transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://facebook.com/people/Weybridge-Lodge-No-6787/61551808420513/" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/50 hover:text-gold transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://twitter.com/weybridgelodge" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/50 hover:text-gold transition-colors" aria-label="X/Twitter">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
            <div className="mt-6 flex gap-4">
              <a href="https://surreyfreemasons.org.uk/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-foreground/40 hover:text-gold transition-colors font-sans">
                Provincial Grand Lodge of Surrey
              </a>
              <a href="https://www.ugle.org.uk/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-foreground/40 hover:text-gold transition-colors font-sans">
                UGLE
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gold/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-primary-foreground/30 font-sans">
            © {new Date().getFullYear()} Weybridge Lodge No. 6787. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/data-protection" className="text-xs text-primary-foreground/30 hover:text-gold transition-colors font-sans">
              Data Protection Policy
            </Link>
            <Link to="/what-is-freemasonry" className="text-xs text-primary-foreground/30 hover:text-gold transition-colors font-sans">
              What is Freemasonry
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
