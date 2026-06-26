import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// ─── Interface ────────────────────────────────────────────────────────────────
interface Video {
  title: string;
  embedId: string;
  channel: string;
  description: string;
  // ISO 8601 upload date — required for VideoObject structured data
  uploadDate: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const videos: Video[] = [
  {
    title: "What Is Freemasonry?",
    embedId: "WAcj4WVLxt0",
    channel: "United Grand Lodge of England",
    description:
      "An introduction to Freemasonry from the United Grand Lodge of England — what the organisation is, what members do, and what the Craft stands for.",
    uploadDate: "2020-01-01",
  },
  {
    title: "Becoming a Freemason",
    embedId: "pJnYjJFGOog",
    channel: "United Grand Lodge of England",
    description:
      "A guide to the process of becoming a Freemason in England — from first enquiry through to initiation, covering what to expect at each stage.",
    uploadDate: "2020-01-01",
  },
  {
    title: "A Day in the Life of a Freemason",
    embedId: "x8VBjhGnEiQ",
    channel: "United Grand Lodge of England",
    description:
      "A personal perspective on what being a Freemason looks and feels like in practice — the meetings, the fellowship, and the charitable work.",
    uploadDate: "2020-01-01",
  },
];

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay },
  }),
  static: { opacity: 1, y: 0 },
};

// ─── Component ────────────────────────────────────────────────────────────────
const VideoHub = () => {
  const shouldReduceMotion = useReducedMotion();

  const pageSchema = useMemo(() => {
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "What is Freemasonry", url: "/what-is-freemasonry" },
      { name: "Video Hub", url: "/video-hub" },
    ]);

    const videoSchemas = videos.map((v) => ({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: `${v.title} | Weybridge Lodge No. 6787 — Freemasons in Guildford, Surrey`,
      description: v.description,
      embedUrl: `https://www.youtube.com/embed/${v.embedId}`,
      uploadDate: v.uploadDate,
      thumbnailUrl: `https://img.youtube.com/vi/${v.embedId}/hqdefault.jpg`,
      publisher: {
        "@type": "Organization",
        name: "United Grand Lodge of England",
        url: "https://www.ugle.org.uk",
      },
    }));

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://www.weybridgelodge.org.uk/video-hub#webpage",
        url: "https://www.weybridgelodge.org.uk/video-hub",
        name: "Freemasonry Videos | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "Watch videos about Freemasonry from the United Grand Lodge of England. Learn what it means to be a Freemason at Weybridge Lodge No. 6787 — our Masonic Lodge in Guildford, Surrey, GU2 4DR.",
        inLanguage: "en-GB",
        isPartOf: {
          "@id": "https://www.weybridgelodge.org.uk/#website",
        },
      },
      ...videoSchemas,
      breadcrumb,
    ];
  }, []);

  return (
    <div className="min-h-screen">
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
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={0}
              className="text-center mb-12"
            >
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2
                id="video-section-heading"
                className="text-2xl md:text-3xl font-serif text-foreground mb-4"
              >
                See what life as a Freemason in Guildford looks like
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg max-w-2xl mx-auto">
                These videos from the United Grand Lodge of England offer an honest, accessible
                introduction to Freemasonry — what it is, what the process of joining involves,
                and what membership looks and feels like in practice at a Masonic Lodge in Surrey.
              </p>
            </motion.div>

            <ul className="space-y-12 list-none p-0">
              {videos.map((video, i) => (
                <motion.li
                  key={video.embedId}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView={shouldReduceMotion ? "static" : "visible"}
                  viewport={{ once: true }}
                  custom={i * 0.1}
                >
                  <h3 className="text-xl font-serif text-foreground mb-2">{video.title}</h3>
                  <p className="text-muted-foreground font-sans text-sm mb-3">{video.channel}</p>
                  <p className="text-muted-foreground font-sans text-base mb-4 leading-relaxed">
                    {video.description}
                  </p>
                  <div className="relative w-full aspect-video rounded-sm overflow-hidden border border-border">
                    <iframe
                      src={`https://www.youtube.com/embed/${video.embedId}`}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        <section className="py-16 bg-navy" aria-labelledby="video-cta-heading">
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView={shouldReduceMotion ? "static" : "visible"}
              viewport={{ once: true }}
              custom={0}
            >
              <div className="h-px w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
              <h2
                id="video-cta-heading"
                className="font-serif text-gold text-2xl md:text-3xl mb-3"
              >
                What would you like to do next?
              </h2>
              <p className="text-gold/70 font-sans mb-8">
                Whether you want to read more, take our quick quiz, or go straight to beginning your
                application to join our Freemasons Lodge in Guildford — the next step is yours.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  to="/join-us"
                  aria-label="Begin your application to join Weybridge Lodge No. 6787 in Guildford"
                  className="inline-flex items-center justify-center gap-2 bg-gold text-navy px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Begin Your Application
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/quiz"
                  aria-label="Take the 2-minute quiz to see if Freemasonry is right for you"
                  className="inline-flex items-center justify-center bg-transparent text-gold border border-gold/40 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Take the 2-Min Quiz
                </Link>
                <Link
                  to="/what-is-freemasonry"
                  aria-label="Read our full guide to what Freemasonry is"
                  className="inline-flex items-center justify-center bg-transparent text-gold border border-gold/40 px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
                >
                  Learn About Freemasonry
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
