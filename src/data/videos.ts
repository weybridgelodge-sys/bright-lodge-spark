// Video catalogue type used by the video sitemap generator
// (`scripts/generate-sitemap-and-feed.ts`). All video content is now
// sourced directly from Sanity; this file only exports the shared type.

export interface VideoEntry {
  title: string;
  youtubeId: string;
  channel: string;
  description: string;
  /** ISO 8601 upload date */
  uploadDate: string;
  /** Duration in seconds — optional, used only for video sitemap */
  durationSeconds?: number;
  /** Site page where the video is embedded */
  page: string;
  /** Sanity slug — when present, the video has its own /video-hub/{slug} detail page */
  slug?: string;
}
