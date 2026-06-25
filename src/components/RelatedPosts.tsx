import { Link } from "react-router-dom";
import { posts, formatDate } from "@/data/posts";

interface Props {
  currentSlug: string;
  category: string;
  limit?: number;
}

const RelatedPosts = ({ currentSlug, category, limit = 3 }: Props) => {
  const byDate = (a: typeof posts[number], b: typeof posts[number]) =>
    new Date(b.date).getTime() - new Date(a.date).getTime();
  const sameCategory = posts.filter((p) => p.category === category && p.slug !== currentSlug).sort(byDate);
  const others = posts.filter((p) => p.category !== category && p.slug !== currentSlug).sort(byDate);
  const related = [...sameCategory, ...others].slice(0, limit);

  if (related.length === 0) return null;

  return (
    <aside aria-labelledby="related-posts-heading" className="mt-12 pt-8 border-t border-border">
      <h2 id="related-posts-heading" className="text-xl font-serif text-foreground mb-6">
        You might also like
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((p) => (
          <Link
            key={p.slug}
            to={`/news/${p.slug}`}
            className="group block bg-card border border-border rounded-sm overflow-hidden hover:border-primary transition-colors"
          >
            <div className="aspect-[16/10] overflow-hidden bg-muted">
              <img
                src={p.image}
                alt={p.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-4">
              <span className="text-xs uppercase tracking-wide text-primary font-sans">{p.category}</span>
              <h3 className="text-base font-serif text-foreground mt-1.5 leading-snug group-hover:text-primary transition-colors">
                {p.title}
              </h3>
              <p className="text-xs text-muted-foreground font-sans mt-2">{formatDate(p.date)}</p>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
};

export default RelatedPosts;
