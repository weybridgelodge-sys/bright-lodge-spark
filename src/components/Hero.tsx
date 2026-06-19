import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import heroAvif from "@/assets/hero-lodge.avif.asset.json";
import heroWebp from "@/assets/hero-lodge.webp.asset.json";
import heroJpg from "@/assets/hero-lodge.optimized.jpg.asset.json";
import logoAsset from "@/assets/weybridge-logo-500.webp.asset.json";
import logoSmallAsset from "@/assets/weybridge-logo-300.webp.asset.json";
const logo = logoAsset.url;
const logoSmall = logoSmallAsset.url;

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-start overflow-hidden">
      <picture>
        <source srcSet={heroAvif.url} type="image/avif" />
        <source srcSet={heroWebp.url} type="image/webp" />
        <img
          src={heroJpg.url}
          alt="South West Surrey Masonic Centre exterior in Guildford, home of Weybridge Lodge No. 6787"
          className="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <div className="absolute inset-0 hero-overlay" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 pt-20">
        <div className="flex md:hidden justify-center mb-8 hero-fade-in" style={{ animationDelay: "0.5s" }}>
          <img
            src={logoSmall}
            alt="Weybridge Lodge No. 6787 crest — Freemasons Lodge in Guildford, Surrey"
            width={150}
            height={150}
            decoding="async"
            className="w-[150px] h-[150px] object-contain brightness-0 invert"
          />
        </div>

        <div className="flex items-center justify-between gap-8">
          <div className="max-w-2xl hero-rise-in">
            <div className="h-0.5 w-20 bg-gold mb-8 hero-rule" />
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-primary-foreground leading-tight mb-6">
              Looking for something
              <span className="block text-gradient-gold text-3xl sm:text-4xl md:text-5xl mt-3">
                more than just a night out?
              </span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 font-sans font-light leading-relaxed mb-10 max-w-xl">
              Weybridge Lodge No. 6787 is a friendly group of men in Guildford — aged 32 to 80 — who meet to make genuine friendships, support local charities, and grow as people. New members are always welcome.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/join-us"
                className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Enquire About Joining
              </Link>
              <Link
                to="/first-visit"
                className="inline-flex items-center justify-center border border-primary-foreground/30 text-primary-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
              >
                Your Initiation Night
              </Link>
            </div>
          </div>

          <img
            src={logo}
            alt="Weybridge Lodge No. 6787 crest — Freemasons Lodge in Guildford, Surrey"
            width={250}
            height={250}
            decoding="async"
            className="hidden md:block w-[250px] h-[250px] object-contain shrink-0 brightness-0 invert hero-fade-in"
            style={{ animationDelay: "0.5s" }}
          />
        </div>
      </div>

      <a
        href="#about"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-primary-foreground/60 hover:text-gold transition-colors hero-fade-in"
        style={{ animationDelay: "1.5s" }}
        aria-label="Scroll to About section"
      >
        <ChevronDown className="w-8 h-8 animate-bounce" aria-hidden="true" />
      </a>
    </section>
  );
};

export default Hero;
