import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  sanityClient,
  POSTS_QUERY,
  formatDate,
  getPostHref,
  getPostThumbnail,
  type SanityPost,
} from "@/lib/sanity";

interface Props {
  currentSlug: string;
  category?: string;
  limit?: number;
}

/**
 * Data-driven "You might also like" + previous/next navigation for any
 * post rendered through the generic Sanity template. Prefers posts in the
 * same category, then falls back to the most recent other posts.
 */
const SanityPostFooterNav = ({ currentSlug, category, limit = 3 }: Props) => {
  const { data: all } = useQuery<SanityPost[]>({
    queryKey: ["posts", "all"],
    queryFn: () => sanityClient.fetch(POSTS_QUERY),
    staleTime: 5 * 60 * 1000,
  });

  if (!all || all.length === 0) return null;

  const others = all.filter((p) => p.slug !== currentSlug);
  const sameCategory = others.filter((p) => p.category === category);
  const rest = others.filter((p) => p.category !== category);
  const related = [...sameCategory, ...rest].slice(0, limit);

  // POSTS_QUERY is ordered newest-first
  const idx = all.findIndex((p) => p.slug === currentSlug);
  const newer = idx > 0 ? all[idx - 1] : null;
  const older = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <>
      {related.length > 0 && (
        <aside aria-labelledby="related-posts-heading" className="mt-12 pt-8 border-t border-border">
          <h2 id="related-posts-heading" className="text-xl font-serif text-foreground mb-6">
            You might also like
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => {
              const thumb = getPostThumbnail(p, 600, 375);
              return (
                <Link
                  key={p._id}
                  to={getPostHref(p)}
                  className="group block bg-card border border-border rounded-sm overflow-hidden hover:border-primary transition-colors"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-muted">
                    {thumb && (
                      <img
                        src={thumb}
                        alt={p.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <span className="text-xs uppercase tracking-wide text-primary font-sans">{p.category}</span>
                    <h3 className="text-base font-serif text-foreground mt-1.5 leading-snug group-hover:text-primary transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-sans mt-2">{formatDate(p.publishedAt)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>
      )}

      <nav aria-label="Post navigation" className="mt-12 pt-8 border-t border-border grid grid-cols-2 gap-4">
        {older ? (
          <Link to={getPostHref(older)} className="group flex flex-col gap-1 text-left">
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Previous Post
            </span>
            <span className="text-sm font-serif text-foreground group-hover:text-primary transition-colors leading-snug">
              {older.title}
            </span>
          </Link>
        ) : (
          <div />
        )}
        {newer ? (
          <Link to={getPostHref(newer)} className="group flex flex-col gap-1 text-right ml-auto">
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1 justify-end">
              Next Post <ArrowRight className="h-3 w-3" />
            </span>
            <span className="text-sm font-serif text-foreground group-hover:text-primary transition-colors leading-snug">
              {newer.title}
            </span>
          </Link>
        ) : (
          <div />
        )}
      </nav>
    </>
  );
};

export default SanityPostFooterNav;
