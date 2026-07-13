import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { PlayCircle, ArrowRight, Clock } from "lucide-react";
import { getAllPublishedVideos, type SanityVideo } from "@/lib/sanity";

// ─── Helper: seconds → mm:ss display ─────────────────────────────────────────
function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Component ───────────────────────────────────────────────────────────────
const VideoHub = () => {
  const shouldReduceMotion = useReducedMotion();

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["video-hub-videos"],
    queryFn: getAllPublishedVideos,
    staleTime: 1000 * 60 * 5,
  });

  const pageSchema = useMemo(() => {
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Video Hub", url: "/video-hub" },
    ]);

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://weybridgelodge.org.uk/video-hub#webpage",
        url: "https://weybridgelodge.org.uk/video-hub",
        name: "Video Hub | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "Watch videos about Freemasonry, life as a Freemason, and Weybridge Lodge No. 6787 — our Freemasons Lodge in Guildford, Surrey.",
        inLanguage: "en-GB",
        isPartOf: { "@id": "https://weybridgelodge.org.uk/#website" },
      },
      breadcrumb,
    ];
  }, []);


  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Freemasonry Videos | Freemasons in Guildford, Surrey"
        description="Watch videos about Freemasonry from the United Grand Lodge of England. Learn what it means to be a Freemason at Weybridge Lodge No. 6787 — our Masonic Lodge in Guildford, Surrey, GU2 4DR."
        canonical="/video-hub"
        schema={pageSchema}
      />
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Freemasonry Videos"
          subtitle="Useful videos about Freemasonry from the United Grand Lodge of England"
        />

        <section className="py-20 md:py-28 bg-warm-white" aria-labelledby="video-section-heading">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2
                id="video-section-heading"
                className="text-2xl md:text-3xl font-serif text-foreground mb-4"
              >
                Watch and learn about Freemasonry in Guildford
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg max-w-2xl mx-auto">
                From an introduction to the Craft to a guided tour of Freemasons' Hall, these
                videos give you an honest look at Freemasonry before you take the next step toward
                joining Weybridge Lodge No. 6787.
              </p>
            </motion.div>

            {isLoading ? (
              <p className="text-center text-muted-foreground font-sans">Loading videos…</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 list-none p-0">
                {(videos as SanityVideo[]).map((video, i) => (
                  <motion.li
                    key={video._id}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                    whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  >
                    <Link
                      to={`/video-hub/${video.slug}`}
                      aria-label={`Watch: ${video.title}`}
                      className="group block h-full rounded-sm overflow-hidden border border-border bg-background hover:border-gold/60 hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <div className="relative w-full aspect-video bg-navy overflow-hidden">
                        <img
                          src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-navy/20 group-hover:bg-navy/10 transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <PlayCircle
                            className="h-14 w-14 text-white drop-shadow-lg group-hover:text-gold transition-colors"
                            aria-hidden="true"
                          />
                        </div>
                        {video.durationSeconds ? (
                          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 bg-navy/90 text-white text-xs font-sans px-2 py-1 rounded-sm">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {formatDuration(video.durationSeconds)}
                          </span>
                        ) : null}
                      </div>

                      <div className="p-5">
                        <h3 className="text-lg font-serif text-foreground mb-2 line-clamp-2 group-hover:text-navy">
                          {video.title}
                        </h3>
                        {video.description ? (
                          <p className="text-muted-foreground font-sans text-sm leading-relaxed line-clamp-2">
                            {video.description}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── Final CTA — no dead end ── */}
        <section className="py-16 bg-navy" aria-labelledby="video-cta-heading">
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2
                id="video-cta-heading"
                className="font-serif text-gold text-2xl md:text-3xl mb-3"
              >
                Ready to find out more?
              </h2>
              <p className="text-gold/70 font-sans mb-8">
                Take our two-minute quiz, or go straight to beginning your application to join our
                Freemasons Lodge in Guildford, Surrey.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  to="/quiz"
                  aria-label="Take the 2-minute quiz to see if Freemasonry is right for you"
                  className="inline-flex items-center justify-center bg-transparent text-gold border border-gold/40 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Take the 2-Min Quiz
                </Link>
                <Link
                  to="/join-us"
                  aria-label="Begin your application to join Weybridge Lodge No. 6787 in Guildford"
                  className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Begin Your Application
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default VideoHub;
