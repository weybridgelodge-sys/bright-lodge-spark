import surreyGold from "@/assets/surrey-2030-gold.png";
import tlcPatron from "@/assets/tlc-patron.jpg";
import anniversaryPhoto from "@/assets/75th-anniversary.webp";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const About = () => {
  const leftRef = useScrollReveal<HTMLDivElement>();
  const rightRef = useScrollReveal<HTMLDivElement>();

  return (
    <section id="about" className="py-24 md:py-32 bg-warm-white">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div ref={leftRef} className="reveal-on-scroll">
            <div className="h-0.5 w-16 bg-gold mb-6" />
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-6 leading-tight">
              Welcome to <br />
              <span className="text-gold-dark">Weybridge Lodge</span>
            </h2>
            <p className="text-muted-foreground font-sans leading-relaxed mb-6">
              Freemasonry helps men become better people through friendship, harmony and community involvement. Weybridge Lodge No. 6787 has been proudly serving the Guildford community since 1949.
            </p>
            <p className="text-muted-foreground font-sans leading-relaxed mb-6">
              We hope that through this website, you learn a little about Freemasonry, our Lodge in particular, and how this worldwide organisation can make a difference to you and your community.
            </p>
            <p className="text-muted-foreground font-sans leading-relaxed mb-6">
              If you have any questions or are interested in taking your first step into Freemasonry, please feel free to contact us. We warmly welcome prospective candidates from all walks of life.
            </p>
            <blockquote className="border-l-4 border-gold pl-5 py-2 bg-warm-white">
              <p className="font-serif italic text-gold-dark text-base md:text-lg leading-relaxed">
                “Weybridge Lodge operates on the principle of the beehive. Every brother, from the newest Entered Apprentice to the most senior Past Master, contributes to the life of the lodge. Working groups exist so that every member has a role, a purpose, and a home in the lodge beyond the progressive offices.”
              </p>
              <footer className="mt-2 text-xs text-muted-foreground not-italic">— Lodge philosophy, adopted 2026</footer>
            </blockquote>
          </div>

          <div ref={rightRef} className="reveal-on-scroll flex flex-col items-center gap-8">
            <div className="relative w-full overflow-hidden rounded-sm shadow-lg">
              <img
                src={anniversaryPhoto}
                alt="Brethren of Weybridge Lodge No. 6787 gathered in the temple at the South West Surrey Masonic Centre to celebrate the Lodge's 75th anniversary in February 2024"
                width={1200}
                height={800}
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-navy/80 backdrop-blur-sm px-4 py-3">
                <p className="text-primary-foreground/90 text-xs font-sans">
                  Celebrating our 75th Anniversary — February 2024
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-36 h-36 rounded-full bg-warm-white shadow-md flex items-center justify-center p-1.5">
                  <img src={surreyGold} alt="Surrey 2030 Festival Gold Award badge presented to Weybridge Lodge for outstanding charitable contributions" width={144} height={144} loading="lazy" decoding="async" className="w-full h-full object-contain rounded-full" />
                </div>
                <p className="text-base font-sans font-bold text-foreground text-center">Festival Gold Award</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-36 h-36 rounded-full bg-warm-white shadow-md flex items-center justify-center p-1.5">
                  <img src={tlcPatron} alt="TLC Patron pin awarded to Weybridge Lodge for charitable patronage" width={144} height={144} loading="lazy" decoding="async" className="w-full h-full object-contain rounded-full" />
                </div>
                <p className="text-base font-sans font-bold text-foreground text-center">TLC Patron</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
