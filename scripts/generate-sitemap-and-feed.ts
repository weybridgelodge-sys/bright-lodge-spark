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
import type { VideoEntry } from "../src/data/videos";
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
  { path: "/south-surrey-freemasons", priority: "0.7", changefreq: "monthly" },
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
  // Bespoke news article pages are supplied by postEntries from Sanity (legacyRoute).
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

// Dedupe sitemap entries by path. When duplicates exist, prefer the entry
// that carries a lastmod value; otherwise keep the last one encountered.
function dedupeEntries(entries: SitemapEntry[]): SitemapEntry[] {
  const byPath = new Map<string, SitemapEntry>();
  for (const e of entries) {
    const existing = byPath.get(e.path);
    if (!existing) {
      byPath.set(e.path, e);
      continue;
    }
    if (e.lastmod && !existing.lastmod) {
      byPath.set(e.path, e);
    } else if (!e.lastmod && existing.lastmod) {
      // keep existing
    } else {
      byPath.set(e.path, e);
    }
  }
  return Array.from(byPath.values());
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

  const allEntries = dedupeEntries([...staticEntries, ...postEntries, ...categoryEntries]);

  writeFileSync(resolve("public/sitemap.xml"), buildSitemap(allEntries));
  console.log(`sitemap.xml written (${allEntries.length} entries)`);

  writeFileSync(resolve("public/feed.xml"), buildFeed(posts));
  console.log(`feed.xml written (${posts.length} items)`);

  // ── Video sitemap ────────────────────────────────────────────────
  let videoSlugs: string[] = [];
  try {
    const videos = await collectVideos();
    const enriched = await enrichVideos(videos);
    writeFileSync(resolve("public/video-sitemap.xml"), buildVideoSitemap(enriched));
    console.log(`video-sitemap.xml written (${enriched.length} videos)`);

    // Per-video detail pages served by /video-hub/:slug — pulled from Sanity.
    try {
      const rows = await sanity.fetch<Array<{ slug: string; _updatedAt: string }>>(
        `*[_type == "video" && published != false && defined(slug.current)] {
          "slug": slug.current, _updatedAt
        }`,
      );
      videoSlugs = rows.map((r) => r.slug);
      const videoDetailEntries: SitemapEntry[] = rows.map((r) => ({
        path: `/video-hub/${r.slug}`,
        lastmod: r._updatedAt?.slice(0, 10),
        changefreq: "yearly",
        priority: "0.5",
      }));
      if (videoDetailEntries.length > 0) {
        const withVideoDetails = dedupeEntries([...allEntries, ...videoDetailEntries]);
        writeFileSync(resolve("public/sitemap.xml"), buildSitemap(withVideoDetails));
        console.log(`sitemap.xml re-written with ${videoDetailEntries.length} video detail pages`);
      }
    } catch (err) {
      console.warn("Could not fetch video slugs for sitemap", err);
    }
  } catch (err) {
    console.warn("Could not write video-sitemap.xml", err);
  }
  void videoSlugs;

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
  slug?: { current?: string };
  youtubeId?: string;
  channel?: string;
  description?: string;
  uploadDate?: string;
  durationSeconds?: number;
  duration?: number;
  page?: string;
  order?: number;
  published?: boolean;
}

async function collectVideos(): Promise<VideoEntry[]> {
  let sanityVideos: VideoEntry[] = [];
  try {
    const rows = await sanity.fetch<SanityVideoRow[]>(
      `*[_type == "video" && published != false && defined(youtubeId)] | order(coalesce(order, 999), title asc) {
        title, slug, youtubeId, channel, description, uploadDate,
        "durationSeconds": coalesce(durationSeconds, duration),
        page, order, published
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
      slug: r.slug?.current,
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

function buildVideoBlock(v: VideoEntry): string {
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
}

function buildVideoSitemap(videos: VideoEntry[]) {
  const urls: string[] = [];

  // Videos with a Sanity slug get their own detail-page <url> entry
  // (one <url> per video pointing at /video-hub/{slug}).
  const withSlug = videos.filter((v) => v.slug);
  for (const v of withSlug) {
    urls.push(
      [
        `  <url>`,
        `    <loc>${BASE_URL}/video-hub/${v.slug}</loc>`,
        buildVideoBlock(v),
        `  </url>`,
      ].join("\n"),
    );
  }

  // Any remaining videos without a slug (e.g. static fallback entries)
  // group under their embed page as before, so nothing is silently dropped.
  const withoutSlug = videos.filter((v) => !v.slug);
  const groups = new Map<string, VideoEntry[]>();
  for (const v of withoutSlug) {
    const page = v.page || "/video-hub";
    if (!groups.has(page)) groups.set(page, []);
    groups.get(page)!.push(v);
  }
  for (const [page, list] of groups) {
    urls.push(
      [
        `  <url>`,
        `    <loc>${BASE_URL}${page}</loc>`,
        ...list.map(buildVideoBlock),
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

// ─────────────────────────────────────────────────────────────────────
// Image sitemap helpers
// ─────────────────────────────────────────────────────────────────────

interface ImageGroup {
  page: string;
  images: PageImage[];
}

// Parse a Sanity image asset ref like
// "image-abc123-1024x768-jpg" into a public cdn.sanity.io URL.
function sanityAssetRefToUrl(ref: string | undefined): string | null {
  if (!ref || !ref.startsWith("image-")) return null;
  const rest = ref.slice("image-".length);
  const lastDash = rest.lastIndexOf("-");
  if (lastDash < 0) return null;
  const ext = rest.slice(lastDash + 1);
  const idAndDims = rest.slice(0, lastDash);
  return `https://cdn.sanity.io/images/sjz7d6eb/production/${idAndDims}.${ext}`;
}

interface SanityHeritageRow {
  title?: string;
  slug?: { current?: string };
  page?: string;
  images?: Array<{
    asset?: { _ref?: string };
    alt?: string;
    caption?: string;
  }>;
}

async function collectImages(posts: PostRow[]): Promise<ImageGroup[]> {
  const groups: ImageGroup[] = staticPageImages
    .filter((g) => g.images.length > 0)
    .map((g) => ({ page: g.page, images: [...g.images] }));

  const upsert = (page: string, images: PageImage[]) => {
    if (images.length === 0) return;
    const existing = groups.find((g) => g.page === page);
    if (existing) existing.images.push(...images);
    else groups.push({ page, images });
  };

  // Sanity news post main images (auto-picked-up as posts are published).
  try {
    const rows = await sanity.fetch<Array<PostRow & { mainImage?: { asset?: { _ref?: string }; alt?: string } }>>(
      `*[_type == "post" && defined(slug.current) && defined(mainImage)] {
        "slug": slug.current, title, publishedAt, category, excerpt, legacyRoute, _updatedAt,
        mainImage { asset, alt }
      }`,
    );
    for (const p of rows) {
      const url = sanityAssetRefToUrl(p.mainImage?.asset?._ref);
      if (!url) continue;
      const page = p.legacyRoute?.trim() || `/news/${p.slug}`;
      upsert(page, [{ loc: url, title: p.mainImage?.alt || p.title }]);
    }
    console.log(`Fetched ${rows.length} post mainImages from Sanity`);
  } catch (err) {
    console.warn("Could not fetch post images from Sanity", err);
  }

  // Optional: heritage archive entries. If a `heritageEntry` schema
  // is later added in Sanity with an `images` array and a `page`
  // path, they get picked up automatically — no code change needed.
  try {
    const rows = await sanity.fetch<SanityHeritageRow[]>(
      `*[_type == "heritageEntry" && defined(images)] {
        title, slug, page, images[] { asset, alt, caption }
      }`,
    );
    for (const r of rows) {
      const page = r.page?.trim() || (r.slug?.current ? `/heritage/${r.slug.current}` : "/heritage");
      const images: PageImage[] = (r.images || [])
        .map((img) => {
          const url = sanityAssetRefToUrl(img.asset?._ref);
          if (!url) return null;
          return {
            loc: url,
            title: img.alt || r.title || "Heritage Archive image",
            caption: img.caption,
          } as PageImage;
        })
        .filter((x): x is PageImage => x !== null);
      upsert(page, images);
    }
    if (rows.length) console.log(`Fetched ${rows.length} heritage entries from Sanity`);
  } catch {
    // Schema type may not exist yet — silently skip.
  }

  return groups;
}

function buildImageSitemap(groups: ImageGroup[]): string {
  const urls = groups.map((g) => {
    const blocks = g.images.map((img) => {
      const locFull = img.loc.startsWith("http") ? img.loc : `${BASE_URL}${img.loc}`;
      const parts = [
        `    <image:image>`,
        `      <image:loc>${escapeXml(locFull)}</image:loc>`,
        `      <image:title>${escapeXml(img.title)}</image:title>`,
        img.caption ? `      <image:caption>${escapeXml(img.caption)}</image:caption>` : null,
        `    </image:image>`,
      ].filter(Boolean);
      return parts.join("\n");
    });
    return [
      `  <url>`,
      `    <loc>${BASE_URL}${g.page}</loc>`,
      ...blocks,
      `  </url>`,
    ].join("\n");
  });

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(0); // Don't break dev/build if Sanity is temporarily unreachable.
});


