import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";

import anniversaryImg from "@/assets/news/75th-anniversary-group.png";
import sandsImg from "@/assets/news/sands-cheque.webp";

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  image: string;
}

const posts: BlogPost[] = [
  {
    slug: "sands-charity",
    title: "Weybridge Lodge Raise £31,000 for SANDS Charity",
    date: "2024-12-12",
    excerpt:
      "In a testament to the power of community and compassion, Weybridge Masonic Lodge has helped raise a staggering £31,331.15 in support of Sands through the Lodge's Ladies Festival.",
    image: sandsImg,
  },
  {
    slug: "75th-anniversary",
    title: "Special Masonic Meeting For 75th Anniversary February 2024",
    date: "2024-02-28",
    excerpt:
      "The founders of Weybridge Lodge would be proud to see that what they started 75 years ago is still going strong. On Wednesday 21st February we celebrated our 75th anniversary at our 374th Regular Masonic Meeting.",
    image: anniversaryImg,
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
                  <Link to={`/news/${post.slug}`} className="contents">
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
                      <h2 className="text-lg font-serif text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                        {post.excerpt}
                      </p>
                    </div>
                  </Link>
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
