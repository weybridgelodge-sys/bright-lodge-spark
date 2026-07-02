// Shared video catalogue used by the Video Hub page AND the video sitemap
// generator (`scripts/generate-sitemap-and-feed.ts`).
//
// The sitemap generator merges these entries with any `video` documents
// published in Sanity, so this file acts as a fallback / seed list until
// the Video Hub content is fully migrated into Sanity.

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
}

export const staticVideos: VideoEntry[] = [
  {
    title: "What Is Freemasonry?",
    youtubeId: "WAcj4WVLxt0",
    channel: "United Grand Lodge of England",
    description:
      "An introduction to Freemasonry from the United Grand Lodge of England — what the organisation is, what members do, and what the Craft stands for.",
    uploadDate: "2020-01-01",
    page: "/video-hub",
  },
  {
    title: "The Origins Of Freemasonry",
    youtubeId: "v_DSCoqrqdA",
    channel: "United Grand Lodge of England",
    description:
      "Freemasonry consists of fraternal groups that trace their origins to medieval guilds of stonemasons. Freemasonry is considered the oldest existing secular fraternal organisation, with documents and traditions dating back to the 14th century.",
    uploadDate: "2020-01-01",
    page: "/video-hub",
  },
  {
    title: "Life Of A Freemason",
    youtubeId: "nk1kcofy6Dw",
    channel: "United Grand Lodge of England",
    description:
      "A personal perspective on what being a Freemason looks and feels like in practice.",
    uploadDate: "2020-01-01",
    page: "/video-hub",
  },
  {
    title: "What's It All About?",
    youtubeId: "da0FZyLktLg",
    channel: "United Grand Lodge of England",
    description:
      "A short film outlining the fundamental values of what it means to be a Freemason.",
    uploadDate: "2020-01-01",
    page: "/video-hub",
  },
  {
    title: "Guided Tour Of Freemasons Hall",
    youtubeId: "ooIm3mNX02E",
    channel: "United Grand Lodge of England",
    description:
      "A guided tour of Freemasons' Hall in London — the home of the United Grand Lodge of England.",
    uploadDate: "2020-01-01",
    page: "/video-hub",
  },
];
