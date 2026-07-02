// Curated inventory of on-page imagery used to build the image XML
// sitemap. Grouped by page path; each entry needs a stable public
// URL (relative to the site root) and a human title. Sanity-driven
// imagery (post mainImages, and any future heritage entry photos)
// is merged in dynamically by scripts/generate-sitemap-and-feed.ts.

export interface PageImage {
  /** Public URL path (leading slash) as served from /public or a Sanity CDN URL. */
  loc: string;
  /** Short human-readable title (< 100 chars). */
  title: string;
  /** Optional longer caption. */
  caption?: string;
}

export interface PageImageGroup {
  page: string;
  images: PageImage[];
}

// Note: paths under /src/assets are bundled with hashed filenames by
// Vite and are not stable public URLs — those cannot be listed here.
// Only assets that live under /public or that resolve to a fixed CDN
// URL (Sanity, external hosts) are eligible.
export const staticPageImages: PageImageGroup[] = [
  {
    page: "/",
    images: [
      {
        loc: "/og-image.png",
        title: "Weybridge Lodge No. 6787 — Freemasons in Guildford, Surrey",
      },
    ],
  },
  {
    page: "/heritage",
    images: [
      // The Heritage Archive currently presents transcribed documents
      // (six lodge summonses, 1954–1962, and the 1969 Ladies'
      // Festival programme) plus Past Master's Jewel photography.
      // Photograph assets will be listed here as they are migrated
      // to /public or published in Sanity — see the dynamic Sanity
      // block in the sitemap generator for auto-discovery.
    ],
  },
];
