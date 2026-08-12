import { useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import { motion } from "framer-motion";
import { Calendar, Tag, User, ArrowLeft, ArrowRight } from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import SocialShare from "@/components/SocialShare";
import CommentsSection, { commentCount } from "@/components/CommentsSection";
import SanityPostFooterNav from "@/components/SanityPostFooterNav";
import NotFound from "@/pages/NotFound";
import {
  sanityClient,
  POST_BY_SLUG_QUERY,
  type SanityPost,
  urlFor,
  LEGACY_IMAGES,
  formatDate,
  slugifyCategory,
} from "@/lib/sanity";

type PortableBlock = {
  _type?: string;
  _key?: string;
  style?: string;
  children?: { text?: string }[];
};

const slugifyHeading = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "section";

const blockText = (block: PortableBlock) =>
  (block.children ?? []).map((c) => c.text ?? "").join("");

/** Auto-generate a table of contents from the post's h2 headings. */
const extractToc = (body: unknown[] | undefined) =>
  ((body ?? []) as PortableBlock[])
    .filter((b) => b._type === "block" && b.style === "h2" && blockText(b).trim())
    .map((b) => {
      const label = blockText(b).trim();
      return { id: slugifyHeading(label), label };
    });


const portableComponents: PortableTextComponents = {
  block: {
    h2: ({ children, value }) => {
      const label = blockText(value as PortableBlock).trim();
      const id = slugifyHeading(label);
      return (
        <section id={id} className="scroll-mt-28 mt-10">
          <div className="h-0.5 w-16 bg-gold mb-6" />
          <h2 className="text-2xl font-serif text-foreground mb-4">{children}</h2>
        </section>
      );
    },
    h3: ({ children }) => (
      <h3 className="text-xl font-serif text-foreground mt-8 mb-3">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-6">
        {children}
      </blockquote>
    ),
    normal: ({ children }) => (
      <p className="text-base text-foreground/90 leading-relaxed mb-5">{children}</p>
    ),
  },
  marks: {
    link: ({ value, children }) => {
      const href = value?.href ?? "#";
      const external = /^https?:\/\//.test(href);
      return (
        <a
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="text-primary underline decoration-primary/40 hover:decoration-primary"
        >
          {children}
        </a>
      );
    },
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc list-inside text-foreground/90 space-y-2 mb-5">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal list-inside text-foreground/90 space-y-2 mb-5">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
    number: ({ children }) => <li className="leading-relaxed">{children}</li>,
  },
  types: {
    image: ({ value }) => {
      if (!value?.asset) return null;
      const src = urlFor(value).width(1200).auto("format").url();
      return (
        <figure className="my-8">
          <img
            src={src}
            alt={value.alt ?? ""}
            className="w-full h-auto rounded-sm border border-border"
            loading="lazy"
          />
          {value.caption && (
            <figcaption className="text-xs text-muted-foreground mt-2 text-center">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
  },
};

const SanityPostPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery<SanityPost | null>({
    queryKey: ["post", slug],
    queryFn: () => sanityClient.fetch(POST_BY_SLUG_QUERY, { slug }),
    enabled: Boolean(slug),
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main id="main-content" className="container mx-auto px-4 py-32 text-center text-muted-foreground">
          Loading article…
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return <NotFound />;
  }

  // If this Sanity document points back to a bespoke designed page,
  // hand off to that route instead of rendering a generic article.
  if (data.legacyRoute && data.legacyRoute.trim() && data.legacyRoute !== `/news/${data.slug}`) {
    return <Navigate to={data.legacyRoute} replace />;
  }

  const heroImage = data.mainImage
    ? urlFor(data.mainImage).width(1600).height(800).fit("crop").auto("format").url()
    : (LEGACY_IMAGES[data.slug] ?? null);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: data.title,
    datePublished: data.publishedAt,
    dateModified: data._updatedAt,
    image: heroImage ? [heroImage] : undefined,
    articleSection: data.category,
    description: data.excerpt,
    mainEntityOfPage: { "@type": "WebPage", "@id": `/news/${data.slug}` },
    publisher: {
      "@type": "Organization",
      name: "Weybridge Lodge No. 6787",
    },
  };

  const shareUrl = `/news/${data.slug}`;
  const toc = extractToc(data.body);



  return (
    <div className="min-h-screen">
      <SEO
        title={data.title}
        description={data.excerpt}
        canonical={`/news/${data.slug}`}
        type="article"
        image={heroImage ?? undefined}
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "News", url: "/news" },
            { name: data.title, url: `/news/${data.slug}` },
          ]),
          articleSchema,
        ]}
      />
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <PageHeader title={data.title} subtitle={data.category} />

        <section className="py-12 md:py-16 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <Link
              to="/news"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
            >
              <ArrowLeft className="h-4 w-4" /> Back to News
            </Link>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-6">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <time dateTime={data.publishedAt}>{formatDate(data.publishedAt)}</time>
              </span>
              {data.author && (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> {data.author}
                </span>
              )}
              <Link
                to={`/news/category/${slugifyCategory(data.category)}`}
                className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
              >
                <Tag className="h-3 w-3" />
                {data.category}
              </Link>
            </div>

            {heroImage && (
              <motion.img
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                src={heroImage}
                alt={(data.mainImage as { alt?: string })?.alt ?? data.title}
                className="w-full aspect-video object-cover rounded-sm border border-border mb-8"
              />
            )}

            <SocialShare url={shareUrl} title={data.title} commentCount={commentCount} />

            {toc.length > 0 && (
              <motion.nav
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                aria-label="Table of contents"
                className="mb-12 p-6 border border-border rounded-sm bg-card"
              >
                <h2 className="text-lg font-serif text-foreground mb-3">Table of Contents</h2>
                <ol className="list-decimal list-inside space-y-1.5">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className="text-sm font-sans text-primary hover:underline">
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </motion.nav>
            )}

            <p className="text-lg text-foreground/85 font-serif italic leading-relaxed mb-8">
              {data.excerpt}
            </p>

            <article className="prose prose-stone max-w-none">
              {data.body && data.body.length > 0 ? (
                <PortableText value={data.body as never} components={portableComponents} />
              ) : (
                <p className="text-base text-muted-foreground leading-relaxed">
                  Full article coming soon.
                </p>
              )}
            </article>

            {data.author && (
              <div className="mt-12 pt-8 border-t border-border">
                <p className="text-sm font-serif text-foreground font-semibold">{data.author}</p>
              </div>
            )}

            <div className="mt-10 p-6 border border-border rounded-sm bg-card">
              <h2 className="text-lg font-serif text-foreground mb-3">Still Have Questions?</h2>
              <p className="text-sm text-muted-foreground font-sans leading-relaxed mb-4">
                Our FAQ covers the questions people usually ask first — what Freemasonry is,
                who can join, what it costs, and what happens at meetings.
              </p>
              <Link
                to="/faq"
                className="inline-flex items-center gap-2 text-primary font-sans font-medium hover:underline"
              >
                Read the FAQ <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-10 text-center">
              <Link
                to="/join-us"
                className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Start Your Enquiry <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-12 pt-8 border-t border-border">
              <SocialShare url={shareUrl} title={data.title} />
            </div>

            <CommentsSection />

            <SanityPostFooterNav currentSlug={data.slug} category={data.category} />

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SanityPostPage;
