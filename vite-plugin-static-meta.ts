import fs from "fs";
import path from "path";
import type { Plugin } from "vite";
import { createClient } from "@sanity/client";

/**
 * Static per-route meta tags.
 *
 * This app is a client-side SPA: dist/index.html's head is served for every
 * route, so crawlers would otherwise see homepage meta everywhere. After the
 * bundle is written we emit one prerendered head variant per public route at
 * dist/<route>/index.html, using each page component's real <SEO> props.
 *
 * Title logic mirrors src/components/SEO.tsx exactly:
 *   title === SITE_NAME ? title : `${title} | ${SITE_NAME}`
 *
 * Excluded by design: /members/*, /checkout/return, /unsubscribe,
 * /history/archive (duplicate of /heritage), /news/category/*, and the
 * generic /news/:slug Sanity fallback.
 */

const SITE_NAME = "Weybridge Lodge No. 6787";
const BASE_URL = "https://weybridgelodge.org.uk";

interface RouteMeta {
  /** Output directory relative to dist (no leading slash) */
  route: string;
  title: string;
  description: string;
  /** Canonical path (may differ from route, e.g. the /ladies-night alias) */
  canonical: string;
}

const buildTitle = (title: string) =>
  title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;

// ── Static pages — props copied verbatim from each page component ──
const staticRoutes: RouteMeta[] = [
  {
    route: "what-is-freemasonry",
    title:
      "What is Freemasonry? | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
    description:
      "Discover what Freemasonry is — its principles of integrity, friendship, respect and service. Learn about Masonic meetings, the three degrees, and how to join our Freemasons Lodge in Guildford, Surrey at GU2 4DR.",
    canonical: "/what-is-freemasonry",
  },
  {
    route: "freemasonry-and-charity",
    title: "Freemasonry & Charity",
    description:
      "Freemasons raise nearly £1 million a week for charity. Discover how Weybridge Lodge No. 6787 and the Masonic Charitable Foundation support local and national causes across Guildford and Surrey from the Guildford Masonic Centre, GU2 4DR.",
    canonical: "/freemasonry-and-charity",
  },
  {
    route: "our-charities",
    title:
      "Our Charities | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
    description:
      "Weybridge Lodge No. 6787 supports SANDS, TLC Appeal Surrey, and the Surrey 2030 Festival. See how Freemasons in Guildford, Surrey give back to their community.",
    canonical: "/our-charities",
  },
  {
    route: "join-us",
    title: "Join Freemasons in Guildford",
    description:
      "Interested in becoming a Freemason in Guildford or Surrey? Join Weybridge Lodge No. 6787 at the Guildford Masonic Centre, GU2 4DR. Contact our Membership Secretary to start your Masonic journey today.",
    canonical: "/join-us",
  },
  {
    route: "first-visit",
    title: "Your Initiation Night",
    description:
      "A candid, reassuring guide to your Masonic initiation night at Weybridge Lodge No. 6787 — what happens, what to wear, and what to expect at the Guildford Masonic Centre, GU2 4DR.",
    canonical: "/first-visit",
  },
  {
    route: "your-initiation",
    title: "Your Initiation Night",
    description:
      "What actually happens on your initiation night at Weybridge Lodge No. 6787 — from arrival to the Festive Board. Your first visit as a Freemason in Guildford.",
    canonical: "/your-initiation",
  },
  {
    route: "your-journey",
    title: "How to Join the Freemasons in Guildford, Surrey",
    description:
      "The complete application process for joining Weybridge Lodge No. 6787 — a Freemasons Lodge in Guildford, Surrey. From first enquiry to initiation night at the Guildford Masonic Centre, GU2 4DR.",
    canonical: "/your-journey",
  },
  {
    route: "lodge-traditions",
    title:
      "Lodge Traditions | Weybridge Lodge No. 6787 | Freemasons in Guildford",
    description:
      "Discover the traditions of Weybridge Lodge No. 6787 — Silent Fire, the Entered Apprentice Song, the Initiates' Chain, and the customs that make our Masonic Lodge in Guildford, Surrey unique.",
    canonical: "/lodge-traditions",
  },
  {
    route: "data-protection",
    title: "Data Protection Policy",
    description:
      "Data protection and privacy policy for Weybridge Lodge No. 6787 website.",
    canonical: "/data-protection",
  },
  {
    route: "accessibility-statement",
    title: "Accessibility Statement | Weybridge Lodge No. 6787",
    description:
      "Accessibility statement for weybridgelodge.org.uk — our commitment to making this website accessible to all visitors and inclusive lodge meetings.",
    canonical: "/accessibility-statement",
  },
  {
    route: "lodge-profile",
    title: "Lodge Profile — Weybridge Lodge No. 6787, Guildford",
    description:
      "Weybridge Lodge No. 6787 — a welcoming Freemasons Lodge in Guildford, Surrey. Founded 1949, 22 members, four meetings a year, active in charity.",
    canonical: "/lodge-profile",
  },
  {
    route: "history",
    title:
      "Lodge History | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
    description:
      "Discover the history of Weybridge Lodge No. 6787 — from wartime Brooklands and the aircraft pioneers of Vickers and Hawker, to our consecration in 1949 and life in Guildford today.",
    canonical: "/history",
  },
  {
    route: "heritage",
    title: "Heritage Archive | Weybridge Lodge No. 6787, Freemasons in Guildford",
    description:
      "Archival summons, historic records and founding heritage of Weybridge Lodge No. 6787, Freemasons meeting at Guildford Masonic Centre since 1949.",
    canonical: "/heritage",
  },
  {
    route: "worshipful-masters",
    title:
      "Worshipful Masters — Roll of Honour | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
    description:
      "The complete Roll of Honour of every Worshipful Master of Weybridge Lodge No. 6787, Guildford, Surrey, from our founding in 1949 to the present day.",
    canonical: "/worshipful-masters",
  },
  {
    route: "officers",
    title:
      "Officers of the Lodge | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
    description:
      "Meet the officers of Weybridge Lodge No. 6787, Guildford, Surrey, for the Masonic Year 2025–2026 — from Worshipful Master to Stewards, with Provincial and Grand honours shown.",
    canonical: "/officers",
  },
  {
    route: "faq",
    title:
      "Freemasonry FAQ | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
    description:
      "Common questions about becoming a Freemason in Guildford and Surrey — fees, initiation, meetings and values. Answered by Weybridge Lodge No. 6787 at the Guildford Masonic Centre, GU2 4DR.",
    canonical: "/faq",
  },
  {
    route: "contact",
    title: "Contact Us",
    description:
      "Contact Weybridge Lodge No. 6787 — Freemasons in Guildford, Surrey. Call, email or visit us at the Guildford Masonic Centre, Hitherbury Close, GU2 4DR.",
    canonical: "/contact",
  },
  {
    route: "video-hub",
    title: "Freemasonry Videos | Freemasons in Guildford, Surrey",
    description:
      "Watch videos about Freemasonry from the United Grand Lodge of England. Learn what it means to be a Freemason at Weybridge Lodge No. 6787 — our Masonic Lodge in Guildford, Surrey, GU2 4DR.",
    canonical: "/video-hub",
  },
  {
    route: "masonic-links",
    title:
      "Masonic Links & Resources | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
    description:
      "Useful Masonic links and resources including UGLE, the Provincial Grand Lodge of Surrey, and the Masonic Charitable Foundation — curated by Weybridge Lodge No. 6787 in Guildford, Surrey.",
    canonical: "/masonic-links",
  },
  {
    route: "bookings",
    title:
      "Dining & Bookings | Weybridge Lodge No. 6787 — Guildford Masonic Centre",
    description:
      "Book your place at the next Weybridge Lodge meeting at the Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford GU2 4DR. View the festive board menu and reserve your seat.",
    canonical: "/bookings",
  },
  {
    route: "officers-jewels",
    title: "Masonic Officer Jewels Explained | Weybridge Lodge No. 6787",
    description:
      "What does each Masonic Lodge officer's jewel mean? A clear guide to every office and jewel, from Steward to Worshipful Master — Weybridge Lodge, Guildford.",
    canonical: "/officers-jewels",
  },
  {
    route: "events",
    title:
      "Events & Meetings | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
    description:
      "View upcoming Freemasons meetings, the 2026 Ladies Festival black tie gala, and weekly Lodge of Instruction evenings at Weybridge Lodge No. 6787, Guildford Masonic Centre, GU2 4DR.",
    canonical: "/events",
  },
  {
    route: "ladies-festival",
    title: "Ladies Festival 2026",
    description:
      "Join Weybridge & Astolat Lodges for a black tie charity gala on 22 August 2026 at Macdonald Frimley Hall Hotel. Three-course dinner, DJ, raffle — in aid of Action for Carers Surrey. Tickets £75.",
    canonical: "/ladies-festival",
  },
  {
    // Intentional alias of /ladies-festival — same meta, canonical stays put.
    route: "ladies-night",
    title: "Ladies Festival 2026",
    description:
      "Join Weybridge & Astolat Lodges for a black tie charity gala on 22 August 2026 at Macdonald Frimley Hall Hotel. Three-course dinner, DJ, raffle — in aid of Action for Carers Surrey. Tickets £75.",
    canonical: "/ladies-festival",
  },
  {
    route: "quiz",
    title: "Is Freemasonry Right for You?",
    description:
      "Take our short personalised quiz to discover whether Freemasonry at Weybridge Lodge No. 6787 in Guildford, Surrey might be right for you.",
    canonical: "/quiz",
  },
  {
    route: "south-surrey-freemasons",
    title: "Surrey Commuter Freemasons Hub | Weybridge Lodge 6787",
    description:
      "Live in Woking, Farnham or Godalming but travel via Guildford? Discover how Weybridge Lodge fits your Surrey commute and lifestyle.",
    canonical: "/south-surrey-freemasons",
  },
  {
    route: "thames-challenge",
    title: "Walking for the Source — Thames Towpath Challenge",
    description:
      "Follow Weybridge Lodge No. 6787 on the Thames Towpath Challenge — a long-distance charity walk from London to the source, told through the people, places, setbacks and determination behind the miles.",
    canonical: "/thames-challenge",
  },
];

// ── Hand-built news article pages ──
const newsRoutes: RouteMeta[] = [
  {
    route: "news/75th-anniversary",
    title: "75th Anniversary Meeting",
    description:
      "Weybridge Lodge No. 6787 celebrated its 75th anniversary at a special Masonic meeting in February 2024 at the Guildford Masonic Centre, Guildford.",
    canonical: "/news/75th-anniversary",
  },
  {
    route: "news/sands-charity",
    title: "£31,000 Raised for SANDS Charity",
    description:
      "Weybridge Lodge No. 6787 raised £31,331 for Sands charity supporting bereaved parents. A record-breaking Freemasons charity donation in Guildford, Surrey.",
    canonical: "/news/sands-charity",
  },
  {
    route: "news/installation-meeting-october-2023",
    title: "Installation Meeting Oct 2023",
    description:
      "Weybridge Lodge's Masonic installation meeting in October 2023, welcoming W Bro. Murray Grubb Jnr as the new Master at the Guildford Masonic Centre.",
    canonical: "/news/installation-meeting-october-2023",
  },
  {
    route: "news/pgm-visit-february-2026",
    title: "PGM Visit February 2026",
    description:
      "The Provincial Grand Master visited Weybridge Lodge No. 6787 for a First Degree Initiation ceremony at the Guildford Masonic Centre, Guildford.",
    canonical: "/news/pgm-visit-february-2026",
  },
  {
    route: "news/surrey-2030-festival-gold",
    title: "Surrey 2030 Festival Gold Award",
    description:
      "Weybridge Lodge No. 6787 secures the prestigious Gold Festival Award for the Surrey 2030 Festival, raising over £15,800 for the Masonic Charitable Foundation.",
    canonical: "/news/surrey-2030-festival-gold",
  },
  {
    route: "news/double-initiation-december-2025",
    title: "Double Initiation at Weybridge Lodge — December 2025",
    description:
      "Weybridge Lodge No. 6787 welcomed two new Brethren in a double First Degree Initiation ceremony in December 2025 at the Guildford Masonic Centre, Guildford.",
    canonical: "/news/double-initiation-december-2025",
  },
  {
    route: "news/three-masonic-degrees-explained",
    title: "The Three Masonic Degrees Explained",
    description:
      "A clear, modern guide to the three degrees of Freemasonry — Entered Apprentice, Fellow Craft and Master Mason — and what each one means for a new member of Weybridge Lodge No. 6787 in Guildford.",
    canonical: "/news/three-masonic-degrees-explained",
  },
  {
    route: "news/royal-arch-explained",
    title: "The Royal Arch Explained — One Journey, One Organisation",
    description:
      "Discover the Royal Arch — the natural completion of Freemasonry's three degrees. Weybridge Lodge No. 6787 in Guildford explains what it means and why UGLE calls it 'one journey, one organisation.'",
    canonical: "/news/royal-arch-explained",
  },
];

// ── Sanity videos (same client config as scripts/generate-sitemap-and-feed.ts) ──
const sanity = createClient({
  projectId: "sjz7d6eb",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  perspective: "published",
});

/** Mirrors toMetaDescription() in src/pages/VideoDetailPage.tsx */
function toMetaDescription(text: string, max = 155): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

async function videoRoutes(): Promise<RouteMeta[]> {
  try {
    const rows = await sanity.fetch<
      { title?: string; slug?: { current?: string }; description?: string }[]
    >(
      `*[_type == "video" && published != false && defined(youtubeId)] | order(coalesce(order, 999), title asc) {
        title, slug, description
      }`,
    );
    return rows
      .filter((r) => r.slug?.current && r.title)
      .map((r) => {
        const slug = r.slug!.current!;
        const description =
          r.description ??
          `Watch “${r.title}” — a video from the Weybridge Lodge Video Hub.`;
        return {
          route: `video-hub/${slug}`,
          title: `${r.title} — Video`,
          description: toMetaDescription(description),
          canonical: `/video-hub/${slug}`,
        };
      });
  } catch (err) {
    console.warn("static-meta: could not fetch videos from Sanity.", err);
    return [];
  }
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const replaceTag = (html: string, pattern: RegExp, replacement: string) => {
  if (!pattern.test(html)) {
    throw new Error(`static-meta: tag not found for ${pattern}`);
  }
  return html.replace(pattern, replacement);
};

function renderHead(baseHtml: string, meta: RouteMeta) {
  const t = escape(buildTitle(meta.title));
  const d = escape(meta.description);
  const url = `${BASE_URL}${meta.canonical}`;

  let html = baseHtml;
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${t}</title>`);
  html = replaceTag(
    html,
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${d}" />`,
  );
  html = replaceTag(
    html,
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${url}" />`,
  );
  html = replaceTag(
    html,
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${url}" />`,
  );
  html = replaceTag(
    html,
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${t}" />`,
  );
  html = replaceTag(
    html,
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${d}" />`,
  );
  html = replaceTag(
    html,
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${t}" />`,
  );
  html = replaceTag(
    html,
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${d}" />`,
  );
  return html;
}

export function staticMeta(): Plugin {
  return {
    name: "static-meta",
    apply: "build",
    async writeBundle(options) {
      const outDir = options.dir ?? path.resolve(process.cwd(), "dist");
      const indexPath = path.join(outDir, "index.html");
      if (!fs.existsSync(indexPath)) return;

      const baseHtml = fs.readFileSync(indexPath, "utf8");
      const routes = [...staticRoutes, ...newsRoutes, ...(await videoRoutes())];

      for (const meta of routes) {
        const routeDir = path.join(outDir, ...meta.route.split("/"));
        fs.mkdirSync(routeDir, { recursive: true });
        fs.writeFileSync(path.join(routeDir, "index.html"), renderHead(baseHtml, meta));
      }

      this.info?.(`static-meta: wrote ${routes.length} prerendered head variants`);
    },
  };
}
