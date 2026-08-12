import { createClient, type SanityClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

// Loose type for any Sanity image reference accepted by imageUrlBuilder.
type SanityImageSource = Parameters<ReturnType<typeof imageUrlBuilder>["image"]>[0];

// Last-resort thumbnail (lodge crest) for any post published without a
// mainImage. All current posts carry their own image from Sanity.
import { assetUrl } from "@/lib/assetUrl";
import crestFallbackImg from "@/assets/weybridge-crest-500.webp.asset.json";

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


/** Last-resort thumbnail so listings never render an empty grey box. */
export const FALLBACK_POST_IMAGE = assetUrl(crestFallbackImg);

export interface SanityPost {
  _id: string;
  _updatedAt: string;
  title: string;
  slug: string;
  publishedAt: string;
  author?: string;
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
  author,
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

export async function getAllPublishedVideos(): Promise<SanityVideo[]> {
  return sanityClient.fetch<SanityVideo[]>(VIDEOS_WITH_SLUG_QUERY);
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
 * else fall back to the lodge crest.
 */
export function getPostThumbnail(post: SanityPost, width = 800, height = 450): string | null {
  if (post.mainImage) {
    try {
      return urlFor(post.mainImage).width(width).height(height).fit("crop").auto("format").url();
    } catch {
      // fall through
    }
  }
  return FALLBACK_POST_IMAGE;
}

/**
 * Where should the listing link a given post? If it has a legacyRoute
 * (one of the bespoke article pages), use that. Otherwise route to the
 * Sanity-backed /news/:slug page.
 */
export function getPostHref(post: Pick<SanityPost, "slug" | "legacyRoute">): string {
  return post.legacyRoute?.trim() || `/news/${post.slug}`;
}
