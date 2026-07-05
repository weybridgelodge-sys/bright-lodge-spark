import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import heroAvif from "@/assets/hero-lodge.avif.asset.json";
import heroAvifMobile from "@/assets/hero-lodge-640.avif.asset.json";
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
        <source media="(max-width: 768px)" srcSet={heroAvifMobile.url} type="image/avif" />
        <source srcSet={heroAvif.url} type="image/avif" />
        <source srcSet={heroWebp.url} type="image/webp" />
        <img
          src={heroJpg.url}
          alt="Guildford Masonic Centre exterior in Guildford, home of Weybridge Lodge No. 6787"
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
            <div className="h-0.5 w-20 bg-gold mb-8 hero-rule" aria-hidden="true" />
            {/* FIXED: h1 previously carried zero geo-signal. Kept the
                emotional hook line, added a keyworded second line so the
                page's literal h1 matches the top high-intent SEO queries
                ("Freemasons in Guildford, Surrey"). Also replaced the
                unapproved text-primary-foreground token with text-warm-white. */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-warm-white leading-tight mb-6">
              Looking for something more than just a night out?
              <span className="block text-gradient-gold text-3xl sm:text-4xl md:text-5xl mt-3">
                Join Freemasons in Guildford, Surrey
              </span>
            </h1>
            <p className="text-lg md:text-xl text-warm-white/80 font-sans font-light leading-relaxed mb-10 max-w-xl">
              Weybridge Lodge No. 6787 is a friendly group of men in Guildford — aged 18 to 80 — who meet to make genuine friendships, support local charities, and grow as people. New members are always welcome.
            </p>
            {/* FIXED: bg-gold-shimmer / text-accent-foreground are not
                approved project tokens — replaced with bg-gold / text-navy.
                border-primary-foreground → border-warm-white. Added
                min-h-[48px] and full-width mobile hitboxes to both CTAs. */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/join-us"
                className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
              >
                Enquire About Joining
              </Link>
              <Link
                to="/first-visit"
                className="inline-flex items-center justify-center border border-warm-white/30 text-warm-white px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors min-h-[48px] w-full sm:w-auto"
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
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-warm-white/60 hover:text-gold transition-colors hero-fade-in"
        style={{ animationDelay: "1.5s" }}
        aria-label="Scroll to About section"
      >
        <ChevronDown className="w-8 h-8 animate-bounce" aria-hidden="true" />
      </a>
    </section>
  );
};

export default Hero;
