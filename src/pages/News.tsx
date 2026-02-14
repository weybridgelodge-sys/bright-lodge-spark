import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, Tag } from "lucide-react";
import { posts, categories, formatDate } from "@/data/posts";

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
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="flex flex-col lg:flex-row gap-10">
              {/* Main grid */}
              <div className="flex-1">
                <div className="grid gap-8 sm:grid-cols-2">
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
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <time dateTime={post.date}>{formatDate(post.date)}</time>
                            </span>
                            <span className="inline-flex items-center gap-1 text-primary font-medium">
                              <Tag className="h-3 w-3" />
                              {post.category}
                            </span>
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

              {/* Sidebar */}
              <aside className="lg:w-72 shrink-0 space-y-8">
                {/* Recent Posts */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="border border-border rounded-sm bg-card p-5"
                >
                  <h3 className="text-base font-serif text-foreground mb-4">Recent Posts</h3>
                  <ul className="space-y-3">
                    {posts.slice(0, 5).map((post) => (
                      <li key={post.slug}>
                        <Link
                          to={`/news/${post.slug}`}
                          className="group flex gap-3 items-start"
                        >
                          <img
                            src={post.image}
                            alt=""
                            className="w-14 h-14 rounded-sm object-cover shrink-0"
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-sans text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                              {post.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(post.date)}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Categories */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="border border-border rounded-sm bg-card p-5"
                >
                  <h3 className="text-base font-serif text-foreground mb-4">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const count = posts.filter((p) => p.category === cat).length;
                      return (
                        <span
                          key={cat}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-sans text-foreground"
                        >
                          <Tag className="h-3 w-3 text-primary" />
                          {cat}
                          <span className="text-muted-foreground">({count})</span>
                        </span>
                      );
                    })}
                  </div>
                </motion.div>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default News;
