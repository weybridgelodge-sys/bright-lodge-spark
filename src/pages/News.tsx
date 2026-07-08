import { useLayoutEffect, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { Calendar, Tag, X, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  sanityClient,
  POSTS_QUERY,
  type SanityPost,
  formatDate,
  slugifyCategory,
  getPostThumbnail,
  getPostHref,
} from "@/lib/sanity";
import { posts as staticPosts } from "@/data/posts";

// ─── Static image fallback map — built once at module scope ──────────────────
const staticImageBySlug: Record<string, string> = Object.fromEntries(
  staticPosts.map((p) => [p.slug, p.image]),
);

// ─── Thumbnail resolver — pure function, no closure dependencies ─────────────
const resolveThumb = (
  post: SanityPost,
  w = 800,
  h = 450,
): string | null =>
  getPostThumbnail(post, w, h) ?? staticImageBySlug[post.slug] ?? null;

const News = () => {
  const shouldReduceMotion = useReducedMotion();
  const [searchParams] = useSearchParams();
  const { category: categorySlug } = useParams<{ category?: string }>();

  const { data: sanityPosts = [], isLoading } = useQuery<SanityPost[]>({
    queryKey: ["posts"],
    queryFn: () => sanityClient.fetch(POSTS_QUERY),
  });

  const posts = useMemo(() => {
    const sanitySlugs = new Set(sanityPosts.map((p) => p.slug));
    const staticAsSanity: SanityPost[] = staticPosts
      .filter((p) => !sanitySlugs.has(p.slug))
      .map((p) => ({
        _id: `static-${p.slug}`,
        _updatedAt: p.date,
        title: p.title,
        slug: p.slug,
        publishedAt: p.date,
        category: p.category,
        excerpt: p.excerpt,
        legacyRoute: p.href ?? `/news/${p.slug}`,
        mainImage: undefined,
      }));

    return [...sanityPosts, ...staticAsSanity].sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }, [sanityPosts]);

  const categories = useMemo(
    () => Array.from(new Set(posts.map((p) => p.category))),
    [posts],
  );

  const categoryFromSlug = useMemo(
    () =>
      categorySlug
        ? (categories.find(
            (c) => slugifyCategory(c) === categorySlug.toLowerCase(),
          ) ?? null)
        : null,
    [categorySlug, categories],
  );

  const activeCategory = categoryFromSlug || searchParams.get("category");

  const filteredPosts = useMemo(
    () =>
      activeCategory
        ? posts.filter((p) => p.category === activeCategory)
        : posts,
    [posts, activeCategory],
  );

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [activeCategory]);

  const pageSchema = useMemo(() => {
    const breadcrumb = breadcrumbSchema(
      categoryFromSlug
        ? [
            { name: "Home", url: "/" },
            { name: "News", url: "/news" },
            {
              name: categoryFromSlug,
              url: `/news/category/${slugifyCategory(categoryFromSlug)}`,
            },
          ]
        : [
            { name: "Home", url: "/" },
            { name: "News", url: "/news" },
          ],
    );

    const path = categoryFromSlug
      ? `/news/category/${slugifyCategory(categoryFromSlug)}`
      : "/news";

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `https://weybridgelodge.org.uk${path}#webpage`,
        url: `https://weybridgelodge.org.uk${path}`,
        name: categoryFromSlug
          ? `${categoryFromSlug} News | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787`
          : "News & Updates | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description: categoryFromSlug
          ? `${categoryFromSlug} news and updates from Weybridge Lodge No. 6787 — a Freemasons Lodge in Guildford, Surrey.`
          : "Latest news and updates from Weybridge Lodge No. 6787 — Masonic meetings, charity events and social gatherings at the Guildford Masonic Centre, GU2 4DR.",
        inLanguage: "en-GB",
        isPartOf: {
          "@id": "https://weybridgelodge.org.uk/#website",
        },
      },
      breadcrumb,
    ];
  }, [categoryFromSlug]);

  const motionProps = (delay = 0) =>
    shouldReduceMotion
      ? { initial: false, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true },
          transition: { duration: 0.5, delay },
        };

  return (
    <div className="min-h-screen">
      <SEO
        title={categoryFromSlug ? `${categoryFromSlug} News` : "News"}
        description={
          categoryFromSlug
            ? `${categoryFromSlug} news and updates from Weybridge Lodge No. 6787 in Guildford, Surrey.`
            : "Latest news and updates from Weybridge Lodge No. 6787 — Masonic meetings, charity events and social gatherings in Guildford, Surrey."
        }
        canonical={
          categoryFromSlug
            ? `/news/category/${slugifyCategory(categoryFromSlug)}`
            : "/news"
        }
        schema={pageSchema}
      />
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <PageHeader
          title={
            categoryFromSlug
              ? `${categoryFromSlug} News`
              : "News & Updates"
          }
          subtitle={
            categoryFromSlug
              ? `${categoryFromSlug} stories from Weybridge Lodge No. 6787, Guildford`
              : "Latest news from Weybridge Lodge No. 6787 — Freemasons in Guildford, Surrey"
          }
        />

        <section className="py-16 md:py-24 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="flex flex-col lg:flex-row gap-10">
              {/* Article Grid */}
              <div className="flex-1">
                <h2 className="sr-only">
                  {activeCategory
                    ? `${activeCategory} articles from Weybridge Lodge`
                    : "All news articles from Weybridge Lodge No. 6787"}
                </h2>

                {activeCategory && (
                  <div className="flex items-center gap-2 mb-6">
                    <p className="text-lg font-serif text-foreground">
                      Category:{" "}
                      <span className="text-primary">{activeCategory}</span>
                    </p>
                    <Link
                      to="/news"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <X className="h-3.5 w-3.5" /> Clear filter
                    </Link>
                  </div>
                )}

                {isLoading && (
                  <div className="text-center text-muted-foreground py-12">
                    Loading posts…
                  </div>
                )}

                {!isLoading && filteredPosts.length === 0 && (
                  <div className="text-center py-12 space-y-6">
                    <p className="text-muted-foreground">
                      No posts found
                      {activeCategory ? ` in "${activeCategory}"` : ""}.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {activeCategory && (
                        <Link
                          to="/news"
                          className="inline-flex items-center justify-center border border-primary text-primary px-6 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          View All Posts
                        </Link>
                      )}
                      <Link
                        to="/join-us"
                        className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-6 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
                      >
                        Join the Lodge
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                )}

                <ul className="grid gap-8 sm:grid-cols-2 list-none p-0 m-0">
                  {filteredPosts.map((post, i) => {
                    const thumb = resolveThumb(post);
                    const href = getPostHref(post);
                    const delay = Math.min(i * 0.08, 0.4);

                    return (
                      <motion.li
                        key={post._id}
                        {...motionProps(delay)}
                        className="group relative flex flex-col overflow-hidden rounded-sm border border-border bg-card shadow-sm hover:shadow-md transition-shadow"
                      >
                        {thumb && (
                          <div className="aspect-video overflow-hidden bg-muted">
                            <img
                              src={thumb}
                              alt={`${post.title} — Weybridge Lodge No. 6787 news`}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                        )}

                        <div className="flex flex-1 flex-col p-5">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <time dateTime={post.publishedAt}>
                                {formatDate(post.publishedAt)}
                              </time>
                            </span>
                            <span className="inline-flex items-center gap-1 text-primary font-medium">
                              <Tag className="h-3 w-3" />
                              {post.category}
                            </span>
                          </div>

                          <h3 className="text-lg font-serif text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">
                            <Link
                              to={href}
                              className="before:absolute before:inset-0 before:content-['']"
                            >
                              {post.title}
                            </Link>
                          </h3>

                          <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                            {post.excerpt}
                          </p>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>

              {/* Sidebar */}
              <aside
                className="lg:w-72 shrink-0 space-y-8"
                aria-label="News sidebar"
              >
                {/* Recent Posts */}
                <motion.div
                  {...motionProps(0)}
                  className="border border-border rounded-sm bg-card p-5"
                >
                  <h2 className="text-base font-serif text-foreground mb-4">
                    Recent Posts
                  </h2>
                  <ul className="space-y-3">
                    {posts.slice(0, 5).map((post) => {
                      const thumb = resolveThumb(post, 120, 120);
                      const href = getPostHref(post);
                      return (
                        <li key={post._id}>
                          <Link
                            to={href}
                            className="group flex gap-3 items-start"
                          >
                            {thumb && (
                              <img
                                src={thumb}
                                alt={`Thumbnail for ${post.title}`}
                                className="w-14 h-14 rounded-sm object-cover shrink-0"
                                loading="lazy"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-sans text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                {post.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatDate(post.publishedAt)}
                              </p>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>

                {/* Categories */}
                <motion.div
                  {...motionProps(0.1)}
                  className="border border-border rounded-sm bg-card p-5"
                >
                  <h2 className="text-base font-serif text-foreground mb-4">
                    Categories
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const count = posts.filter((p) => p.category === cat).length;
                      const isActive = activeCategory === cat;
                      return (
                        <Link
                          key={cat}
                          to={`/news/category/${slugifyCategory(cat)}`}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-sans transition-colors ${
                            isActive
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border bg-muted/50 text-foreground hover:border-primary hover:text-primary"
                          }`}
                        >
                          <Tag className="h-3 w-3 text-primary" />
                          {cat}
                          <span className="text-muted-foreground">({count})</span>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              </aside>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-16 bg-navy-gradient">
          <div className="container mx-auto px-4 sm:px-6 text-center max-w-2xl">
            <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-serif text-primary-foreground mb-4">
              Interested in joining us?
            </h2>
            <p className="text-primary-foreground/80 font-sans mb-8 leading-relaxed">
              Everything you read about here happens at Weybridge Lodge No. 6787 — a
              Masonic Lodge in Guildford, Surrey. If you would like to be part of it,
              we would be glad to hear from you.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/join-us"
                className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Begin Your Application
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/quiz"
                className="inline-flex items-center justify-center border border-primary-foreground/40 text-primary-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-primary-foreground/10 transition-colors"
              >
                Take the 2-Min Quiz
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default News;
