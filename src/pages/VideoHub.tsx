import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";

const videos = [
  {
    title: "What Is Freemasonry?",
    embedId: "WAcj4WVLxt0",
    channel: "United Grand Lodge of England",
  },
  {
    title: "Becoming a Freemason",
    embedId: "pJnYjJFGOog",
    channel: "United Grand Lodge of England",
  },
  {
    title: "A Day in the Life of a Freemason",
    embedId: "x8VBjhGnEiQ",
    channel: "United Grand Lodge of England",
  },
];

const VideoHub = () => {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Video Hub"
          subtitle="Useful videos about Freemasonry"
        />

        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-4xl">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-muted-foreground font-sans leading-relaxed text-lg mb-12 text-center"
            >
              Our Video Hub contains a selection of useful videos about Freemasonry and what it means to be a Freemason.
            </motion.p>

            <div className="space-y-12">
              {videos.map((video, i) => (
                <motion.div
                  key={video.embedId}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                >
                  <h3 className="text-xl font-serif text-foreground mb-2">{video.title}</h3>
                  <p className="text-muted-foreground font-sans text-sm mb-4">{video.channel}</p>
                  <div className="relative w-full aspect-video rounded-sm overflow-hidden border border-border shadow-lg">
                    <iframe
                      src={`https://www.youtube.com/embed/${video.embedId}`}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                      loading="lazy"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default VideoHub;
