import { createClient, type SanityClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

// Loose type for any Sanity image reference accepted by imageUrlBuilder.
type SanityImageSource = Parameters<ReturnType<typeof imageUrlBuilder>["image"]>[0];

// Bundled fallback images for the 5 originally hand-coded posts so the
// listing keeps its existing thumbnails even though the Sanity documents
// were seeded without binary uploads. New posts created in Studio use
// their own mainImage and don't appear in this map.
import apgmVisitImg from "@/assets/news/apgm-visit-full.jpg";
import sandsImg from "@/assets/news/sands-cheque.webp";
import anniversaryImg from "@/assets/news/75th-anniversary-group.png";
import installationImg from "@/assets/news/installation-meeting-group.jpg";
import surrey2030Img from "@/assets/news/surrey-2030-gold-trophy.jpg.asset.json";

export const SANITY_PROJECT_ID = "sjz7d6eb";
export const SANITY_DATASET = "production";
export const SANITY_API_VERSION = "2024-01-01";
export const SANITY_STUDIO_URL = "https://weybridge-lodge-mcp.sanity.studio/";

export const sanityClient: SanityClient = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  useCdn: true,
  perspective: "published",
});

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

export const LEGACY_IMAGES: Record<string, string> = {
  "surrey-2030-festival-gold": surrey2030Img.url,
  "pgm-visit-february-2026": apgmVisitImg,
  "sands-charity": sandsImg,
  "75th-anniversary": anniversaryImg,
  "installation-meeting-october-2023": installationImg,
};

export interface SanityPost {
  _id: string;
  _updatedAt: string;
  title: string;
  slug: string;
  publishedAt: string;
  category: string;
  excerpt: string;
  mainImage?: SanityImageSource & { alt?: string };
  body?: unknown[];
  legacyRoute?: string;
}

const postProjection = `{
  _id,
  _updatedAt,
  title,
  "slug": slug.current,
  publishedAt,
  category,
  excerpt,
  mainImage,
  body,
  legacyRoute
}`;

export const POSTS_QUERY = `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) ${postProjection}`;
export const POST_BY_SLUG_QUERY = `*[_type == "post" && slug.current == $slug][0] ${postProjection}`;
export const CATEGORIES_QUERY = `array::unique(*[_type == "post" && defined(category)].category)`;

// ── Video ────────────────────────────────────────────────────────────
export interface SanityVideo {
  _id: string;
  title: string;
  slug: string;
  youtubeId: string;
  channel?: string;
  description?: string;
  uploadDate?: string;
  durationSeconds?: number;
  page?: string;
  published?: boolean;
}

const videoProjection = `{
  _id,
  title,
  "slug": slug.current,
  youtubeId,
  channel,
  description,
  uploadDate,
  "durationSeconds": coalesce(durationSeconds, duration),
  page,
  published
}`;

export const VIDEOS_WITH_SLUG_QUERY = `*[_type == "video" && published != false && defined(slug.current) && defined(youtubeId)] | order(coalesce(order, 999), title asc) ${videoProjection}`;
export const VIDEO_BY_SLUG_QUERY = `*[_type == "video" && slug.current == $slug && published != false][0] ${videoProjection}`;

export async function getVideoBySlug(slug: string): Promise<SanityVideo | null> {
  const doc = await sanityClient.fetch<SanityVideo | null>(VIDEO_BY_SLUG_QUERY, { slug });
  return doc ?? null;
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const slugifyCategory = (s: string) =>
  s.toLowerCase().replace(/\s+/g, "-");

/**
 * Resolve the listing thumbnail for a post: prefer Sanity's mainImage,
 * else fall back to a bundled legacy image, else null.
 */
export function getPostThumbnail(post: SanityPost, width = 800, height = 450): string | null {
  if (post.mainImage) {
    try {
      return urlFor(post.mainImage).width(width).height(height).fit("crop").auto("format").url();
    } catch {
      // fall through
    }
  }
  return LEGACY_IMAGES[post.slug] ?? null;
}

/**
 * Where should the listing link a given post? If it has a legacyRoute
 * (one of the bespoke article pages), use that. Otherwise route to the
 * Sanity-backed /news/:slug page.
 */
export function getPostHref(post: Pick<SanityPost, "slug" | "legacyRoute">): string {
  return post.legacyRoute?.trim() || `/news/${post.slug}`;
}
