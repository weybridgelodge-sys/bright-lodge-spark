import { useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import { motion } from "framer-motion";
import { Calendar, Tag, ArrowLeft } from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import SocialShare from "@/components/SocialShare";
import NotFound from "@/pages/NotFound";
import {
  sanityClient,
  POST_BY_SLUG_QUERY,
  type SanityPost,
  urlFor,
  formatDate,
  slugifyCategory,
} from "@/lib/sanity";

const portableComponents: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <h2 className="text-2xl font-serif text-foreground mt-10 mb-4">{children}</h2>
    ),
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
    : null;

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

  return (
    <div className="min-h-screen">
      <SEO
        title={`${data.title} | Weybridge Lodge News`}
        description={data.excerpt}
        canonical={`/news/${data.slug}`}
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

            <div className="mt-12 pt-8 border-t border-border">
              <SocialShare
                url={`https://www.weybridgelodge.org.uk/news/${data.slug}`}
                title={data.title}
              />
            </div>
          </div>
        </section>

        <section className="py-16 bg-navy-gradient">
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <Link
              to="/join-us"
              className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Join Weybridge Lodge
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SanityPostPage;
