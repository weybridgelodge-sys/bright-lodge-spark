// Runs before vite dev/build via predev/prebuild scripts. Fetches the
// live post list from Sanity and rewrites public/sitemap.xml and
// public/feed.xml so search engines and RSS readers always see what the
// Lodge Secretary just published.
import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@sanity/client";

const BASE_URL = "https://www.weybridgelodge.org.uk";

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
  { path: "/data-protection", priority: "0.3", changefreq: "yearly" },
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
}

main().catch((err) => {
  console.error(err);
  process.exit(0); // Don't break dev/build if Sanity is temporarily unreachable.
});
