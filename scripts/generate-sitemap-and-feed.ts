// Runs before vite dev/build via predev/prebuild scripts. Fetches the
// live post list from Sanity and rewrites public/sitemap.xml and
// public/feed.xml so search engines and RSS readers always see what the
// Lodge Secretary just published.
//
// It also builds public/video-sitemap.xml — a Google video sitemap
// covering every embedded YouTube video on the site (merging the shared
// catalogue in src/data/videos.ts with any `video` documents published
// in Sanity). Missing titles/thumbnails are enriched via YouTube's
// public oEmbed endpoint.
import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@sanity/client";
import { staticVideos, type VideoEntry } from "../src/data/videos";
import { staticPageImages, type PageImage } from "../src/data/siteImages";


const BASE_URL = "https://weybridgelodge.org.uk";

const sanity = createClient({
  projectId: "sjz7d6eb",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  perspective: "published",
});

interface PostRow {
  slug: string;
  title: string;
  publishedAt: string;
  category: string;
  excerpt: string;
  legacyRoute?: string;
  _updatedAt: string;
}

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Static, hand-maintained list of indexable site routes (mirrors src/App.tsx).
const staticEntries: SitemapEntry[] = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/join-us", priority: "0.9", changefreq: "monthly" },
  { path: "/what-is-freemasonry", priority: "0.9", changefreq: "monthly" },
  { path: "/lodge-profile", priority: "0.8", changefreq: "monthly" },
  { path: "/history", priority: "0.8", changefreq: "yearly" },
  { path: "/heritage", priority: "0.6", changefreq: "yearly" },
  { path: "/freemasonry-and-charity", priority: "0.8", changefreq: "monthly" },
  { path: "/our-charities", priority: "0.7", changefreq: "monthly" },
  { path: "/officers", priority: "0.7", changefreq: "yearly" },
  { path: "/worshipful-masters", priority: "0.6", changefreq: "yearly" },
  { path: "/officers-jewels", priority: "0.7", changefreq: "yearly" },
  { path: "/events", priority: "0.8", changefreq: "weekly" },
  { path: "/news", priority: "0.8", changefreq: "weekly" },
  { path: "/faq", priority: "0.8", changefreq: "monthly" },
  { path: "/contact", priority: "0.8", changefreq: "monthly" },
  { path: "/bookings", priority: "0.7", changefreq: "monthly" },
  { path: "/video-hub", priority: "0.6", changefreq: "monthly" },
  { path: "/masonic-links", priority: "0.5", changefreq: "yearly" },
  { path: "/lodge-traditions", priority: "0.6", changefreq: "yearly" },
  { path: "/first-visit", priority: "0.7", changefreq: "monthly" },
  { path: "/your-initiation", priority: "0.6", changefreq: "yearly" },
  { path: "/your-journey", priority: "0.6", changefreq: "yearly" },
  { path: "/ladies-festival", priority: "0.7", changefreq: "monthly" },
  { path: "/ladies-night", priority: "0.6", changefreq: "monthly" },
  { path: "/quiz", priority: "0.5", changefreq: "monthly" },
  { path: "/accessibility-statement", priority: "0.3", changefreq: "yearly" },
  { path: "/data-protection", priority: "0.3", changefreq: "yearly" },
  // Bespoke news article pages (also backed by Sanity legacyRoute, listed here as a safety net).
  { path: "/news/75th-anniversary", priority: "0.6", changefreq: "yearly" },
  { path: "/news/sands-charity", priority: "0.6", changefreq: "yearly" },
  { path: "/news/installation-meeting-october-2023", priority: "0.6", changefreq: "yearly" },
  { path: "/news/pgm-visit-february-2026", priority: "0.6", changefreq: "yearly" },
  { path: "/news/surrey-2030-festival-gold", priority: "0.6", changefreq: "yearly" },
  { path: "/news/double-initiation-december-2025", priority: "0.6", changefreq: "yearly" },
  { path: "/news/three-masonic-degrees-explained", priority: "0.6", changefreq: "yearly" },
  { path: "/news/royal-arch-explained", priority: "0.6", changefreq: "yearly" },
  { path: "/thames-challenge", priority: "0.6", changefreq: "yearly" },
  // Intentionally excluded from the sitemap:
  //   /unsubscribe, /checkout/return — transactional, must not be indexed.
  //   /history/archive — duplicate route that renders HeritageArchive; canonical is /heritage.
  //   /guildford-freemasons-what-is-freemasonry — legacy redirect → /what-is-freemasonry.
  //   /frequently-asked-questions-about-freemasonry — legacy redirect → /what-is-freemasonry.
  //   /guildford-freemasons-charity-surrey — legacy redirect → /our-charities.
];

const slugifyCategory = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) => {
    const parts = [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ].filter(Boolean);
    return parts.join("\n");
  });
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

function buildFeed(posts: PostRow[]) {
  const items = posts.map((p) => {
    const link = p.legacyRoute?.trim() || `/news/${p.slug}`;
    const url = `${BASE_URL}${link}`;
    return [
      `    <item>`,
      `      <title>${escapeXml(p.title)}</title>`,
      `      <link>${url}</link>`,
      `      <guid isPermaLink="true">${url}</guid>`,
      `      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>`,
      `      <category>${escapeXml(p.category)}</category>`,
      `      <description>${escapeXml(p.excerpt)}</description>`,
      `    </item>`,
    ].join("\n");
  });

  const lastBuild = new Date().toUTCString();
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    `  <channel>`,
    `    <title>Weybridge Lodge No. 6787 — News</title>`,
    `    <link>${BASE_URL}/news</link>`,
    `    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />`,
    `    <description>Latest news, meetings and charity updates from Weybridge Lodge No. 6787 in Guildford, Surrey.</description>`,
    `    <language>en-gb</language>`,
    `    <lastBuildDate>${lastBuild}</lastBuildDate>`,
    ...items,
    `  </channel>`,
    `</rss>`,
  ].join("\n");
}

async function main() {
  let posts: PostRow[] = [];
  try {
    posts = await sanity.fetch<PostRow[]>(
      `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
        "slug": slug.current,
        title,
        publishedAt,
        category,
        excerpt,
        legacyRoute,
        _updatedAt
      }`
    );
    console.log(`Fetched ${posts.length} posts from Sanity`);
  } catch (err) {
    console.warn("Could not fetch posts from Sanity — sitemap/feed will use static entries only.", err);
  }

  const postEntries: SitemapEntry[] = posts.map((p) => ({
    path: p.legacyRoute?.trim() || `/news/${p.slug}`,
    lastmod: p._updatedAt?.slice(0, 10),
    changefreq: "yearly",
    priority: "0.6",
  }));

  const categorySlugs = Array.from(new Set(posts.map((p) => slugifyCategory(p.category))));
  const categoryEntries: SitemapEntry[] = categorySlugs.map((c) => ({
    path: `/news/category/${c}`,
    changefreq: "monthly",
    priority: "0.5",
  }));

  const allEntries = [...staticEntries, ...postEntries, ...categoryEntries];

  writeFileSync(resolve("public/sitemap.xml"), buildSitemap(allEntries));
  console.log(`sitemap.xml written (${allEntries.length} entries)`);

  writeFileSync(resolve("public/feed.xml"), buildFeed(posts));
  console.log(`feed.xml written (${posts.length} items)`);

  // ── Video sitemap ────────────────────────────────────────────────
  try {
    const videos = await collectVideos();
    const enriched = await enrichVideos(videos);
    writeFileSync(resolve("public/video-sitemap.xml"), buildVideoSitemap(enriched));
    console.log(`video-sitemap.xml written (${enriched.length} videos)`);
  } catch (err) {
    console.warn("Could not write video-sitemap.xml", err);
  }

  // ── Image sitemap ────────────────────────────────────────────────
  try {
    const groups = await collectImages(posts);
    writeFileSync(resolve("public/image-sitemap.xml"), buildImageSitemap(groups));
    const total = groups.reduce((n, g) => n + g.images.length, 0);
    console.log(`image-sitemap.xml written (${total} images across ${groups.length} pages)`);
  } catch (err) {
    console.warn("Could not write image-sitemap.xml", err);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Video sitemap helpers
// ─────────────────────────────────────────────────────────────────────

interface SanityVideoRow {
  title?: string;
  youtubeId?: string;
  channel?: string;
  description?: string;
  uploadDate?: string;
  durationSeconds?: number;
  page?: string;
  order?: number;
  published?: boolean;
}

async function collectVideos(): Promise<VideoEntry[]> {
  let sanityVideos: VideoEntry[] = [];
  try {
    const rows = await sanity.fetch<SanityVideoRow[]>(
      `*[_type == "video" && published != false && defined(youtubeId)] | order(coalesce(order, 999), title asc) {
        title, youtubeId, channel, description, uploadDate, durationSeconds, page, order, published
      }`,
    );
    sanityVideos = rows.map((r) => ({
      title: r.title ?? "",
      youtubeId: r.youtubeId!.trim(),
      channel: r.channel ?? "",
      description: r.description ?? "",
      uploadDate: r.uploadDate ?? "",
      durationSeconds: r.durationSeconds,
      page: r.page?.trim() || "/video-hub",
    }));
    console.log(`Fetched ${sanityVideos.length} videos from Sanity`);
  } catch (err) {
    console.warn("Could not fetch videos from Sanity — falling back to static list only.", err);
  }

  // Dedupe by youtubeId, preferring Sanity entries (they come first).
  const byId = new Map<string, VideoEntry>();
  for (const v of [...sanityVideos, ...staticVideos]) {
    if (!v.youtubeId) continue;
    if (!byId.has(v.youtubeId)) byId.set(v.youtubeId, v);
  }
  return Array.from(byId.values());
}

async function fetchOEmbed(videoId: string): Promise<{ title?: string; author?: string } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string };
    return { title: data.title, author: data.author_name };
  } catch {
    return null;
  }
}

async function enrichVideos(videos: VideoEntry[]): Promise<VideoEntry[]> {
  return Promise.all(
    videos.map(async (v) => {
      if (v.title && v.description) return v;
      const meta = await fetchOEmbed(v.youtubeId);
      return {
        ...v,
        title: v.title || meta?.title || v.youtubeId,
        channel: v.channel || meta?.author || v.channel,
        description: v.description || meta?.title || v.title || v.youtubeId,
      };
    }),
  );
}

function buildVideoSitemap(videos: VideoEntry[]) {
  const groups = new Map<string, VideoEntry[]>();
  for (const v of videos) {
    const page = v.page || "/video-hub";
    if (!groups.has(page)) groups.set(page, []);
    groups.get(page)!.push(v);
  }

  const urls: string[] = [];
  for (const [page, list] of groups) {
    const videoBlocks = list.map((v) => {
      const desc = (v.description || v.title).slice(0, 2048);
      const parts = [
        `    <video:video>`,
        `      <video:thumbnail_loc>https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg</video:thumbnail_loc>`,
        `      <video:title>${escapeXml(v.title)}</video:title>`,
        `      <video:description>${escapeXml(desc)}</video:description>`,
        `      <video:player_loc allow_embed="yes">https://www.youtube.com/embed/${v.youtubeId}</video:player_loc>`,
        v.durationSeconds ? `      <video:duration>${v.durationSeconds}</video:duration>` : null,
        v.uploadDate ? `      <video:publication_date>${v.uploadDate}</video:publication_date>` : null,
        `      <video:family_friendly>yes</video:family_friendly>`,
        `      <video:live>no</video:live>`,
        `    </video:video>`,
      ].filter(Boolean);
      return parts.join("\n");
    });

    urls.push(
      [
        `  <url>`,
        `    <loc>${BASE_URL}${page}</loc>`,
        ...videoBlocks,
        `  </url>`,
      ].join("\n"),
    );
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(0); // Don't break dev/build if Sanity is temporarily unreachable.
});

