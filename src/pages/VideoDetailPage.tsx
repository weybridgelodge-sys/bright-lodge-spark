import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { getVideoBySlug, type SanityVideo } from "@/lib/sanity";

// ─── Helper: seconds → ISO 8601 duration for schema.org ───────────────────────
function toIso8601Duration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  let out = "PT";
  if (h) out += `${h}H`;
  if (m) out += `${m}M`;
  if (s || (!h && !m)) out += `${s}S`;
  return out;
}

// ─── Helper: truncate long Sanity description for meta tag (~155 chars) ──────
function toMetaDescription(text: string, max = 155): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

const VideoDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const shouldReduceMotion = useReducedMotion();
  const [video, setVideo] = useState<SanityVideo | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    getVideoBySlug(slug)
      .then((v) => {
        if (!cancelled) setVideo(v);
      })
      .catch(() => {
        if (!cancelled) setVideo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (video === undefined) {
    return (
      <div className="min-h-screen overflow-x-hidden">
        <Header />
        <main id="main-content" className="py-28 text-center text-muted-foreground font-sans">
          Loading…
        </main>
        <Footer />
      </div>
    );
  }

  if (!video) {
    return <Navigate to="/video-hub" replace />;
  }

  const embedUrl = `https://www.youtube.com/embed/${video.youtubeId}`;
  const thumbnailUrl = `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`;
  const description =
    video.description ?? `Watch “${video.title}” — a video from the Weybridge Lodge Video Hub.`;
  const metaDescription = toMetaDescription(description);
  const channel = video.channel ?? "United Grand Lodge of England";
  const uploadDate = video.uploadDate ?? "2020-01-01";

  const videoObject: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description,
    thumbnailUrl: [thumbnailUrl],
    uploadDate,
    embedUrl,
    publisher: {
      "@type": "Organization",
      name: "Weybridge Lodge No. 6787",
    },
  };
  if (video.durationSeconds) {
    videoObject.duration = toIso8601Duration(video.durationSeconds);
  }

  const pageSchema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `https://weybridgelodge.org.uk/video-hub/${video.slug}#webpage`,
      url: `https://weybridgelodge.org.uk/video-hub/${video.slug}`,
      name: `${video.title} | Weybridge Lodge No. 6787, Guildford`,
      description: metaDescription,
      inLanguage: "en-GB",
      isPartOf: { "@id": "https://weybridgelodge.org.uk/#website" },
    },
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Video Hub", url: "/video-hub" },
      { name: video.title, url: `/video-hub/${video.slug}` },
    ]),
    videoObject,
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title={`${video.title} — Video`}
        description={metaDescription}
        canonical={`/video-hub/${video.slug}`}
        type="video.other"
        image={thumbnailUrl}
        schema={pageSchema}
      />
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <PageHeader title={video.title} subtitle="Weybridge Lodge Video Hub" />

        <section className="py-16 md:py-20 bg-background" aria-labelledby="video-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 id="video-heading" className="sr-only">
                {video.title}
              </h2>
              <div className="relative w-full aspect-video rounded-sm overflow-hidden border border-border bg-navy">
                <iframe
                  src={embedUrl}
                  title={video.title}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>

              <p className="text-muted-foreground font-sans text-sm mt-4">
                {channel}
                {video.uploadDate && (
                  <>
                    {" · "}
                    {new Date(uploadDate).toLocaleDateString("en-GB", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </>
                )}
              </p>

              <p className="text-foreground font-sans leading-relaxed mt-6 whitespace-pre-line">
                {description}
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-16 bg-navy" aria-labelledby="video-cta-heading">
          <div className="container mx-auto px-6 max-w-2xl text-center">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2 id="video-cta-heading" className="font-serif text-gold text-2xl md:text-3xl mb-3">
                Curious to see more?
              </h2>
              <p className="text-gold/70 font-sans mb-8">
                Explore more videos in our library, or take the next step toward joining our
                Freemasons Lodge in Guildford, Surrey.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  to="/video-hub"
                  aria-label="Browse all videos in the Weybridge Lodge Video Hub"
                  className="inline-flex items-center justify-center gap-2 bg-transparent text-gold border border-gold/40 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  More Videos
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

export default VideoDetailPage;
