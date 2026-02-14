import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { posts } from "@/data/posts";

interface Props {
  currentSlug: string;
}

const PostNavigation = ({ currentSlug }: Props) => {
  const idx = posts.findIndex((p) => p.slug === currentSlug);
  // posts are newest-first, so "newer" = idx-1, "older" = idx+1
  const newer = idx > 0 ? posts[idx - 1] : null;
  const older = idx < posts.length - 1 ? posts[idx + 1] : null;

  return (
    <nav aria-label="Post navigation" className="mt-12 pt-8 border-t border-border grid grid-cols-2 gap-4">
      {older ? (
        <Link
          to={`/news/${older.slug}`}
          className="group flex flex-col gap-1 text-left"
        >
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
        <Link
          to={`/news/${newer.slug}`}
          className="group flex flex-col gap-1 text-right ml-auto"
        >
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
  );
};

export default PostNavigation;
