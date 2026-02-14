import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  image: string;
}

const posts: BlogPost[] = [
  {
    slug: "installation-meeting-2025",
    title: "Installation Meeting 2025",
    date: "2025-11-15",
    excerpt:
      "Weybridge Lodge welcomed its new Worshipful Master at a splendid Installation ceremony attended by distinguished guests from across the Province of Surrey.",
    image: "/placeholder.svg",
  },
  {
    slug: "charity-fundraiser-success",
    title: "Annual Charity Fundraiser Raises Record Sum",
    date: "2025-09-20",
    excerpt:
      "Our annual Ladies' Evening and charity dinner raised a record-breaking amount for the Surrey Masonic Charitable Foundation and local community causes.",
    image: "/placeholder.svg",
  },
  {
    slug: "lodge-summer-bbq",
    title: "Lodge Summer BBQ – A Great Day Out",
    date: "2025-07-12",
    excerpt:
      "Members, families and friends gathered for our popular summer barbecue, enjoying excellent weather, good food and wonderful company at Brooklands.",
    image: "/placeholder.svg",
  },
  {
    slug: "provincial-grand-lodge-honours",
    title: "Provincial Grand Lodge Honours for Weybridge Brethren",
    date: "2025-06-05",
    excerpt:
      "Congratulations to our brethren who received Provincial Grand Lodge honours at the annual meeting held at Freemasons' Hall, Great Queen Street.",
    image: "/placeholder.svg",
  },
  {
    slug: "mentoring-programme-launch",
    title: "New Mentoring Programme Launched",
    date: "2025-04-18",
    excerpt:
      "Weybridge Lodge has introduced an enhanced mentoring programme to support new members on their Masonic journey, pairing them with experienced Past Masters.",
    image: "/placeholder.svg",
  },
  {
    slug: "visiting-lodge-evening",
    title: "Fraternal Visit from Addlestone Lodge",
    date: "2025-03-01",
    excerpt:
      "We were delighted to host brethren from Addlestone Lodge No. 4620 for a memorable third-degree ceremony followed by a superb Festive Board.",
    image: "/placeholder.svg",
  },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const News = () => {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <PageHeader title="News" subtitle="Latest updates from Weybridge Lodge No. 6787" />

        <section className="py-16 md:py-24 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <motion.article
                  key={post.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="group flex flex-col overflow-hidden rounded-sm border border-border bg-card shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="aspect-video overflow-hidden bg-muted">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                    </div>
                    <h2 className="text-lg font-serif text-foreground mb-2 leading-snug">
                      {post.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                      {post.excerpt}
                    </p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default News;
