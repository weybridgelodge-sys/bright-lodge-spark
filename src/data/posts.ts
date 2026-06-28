import apgmVisitImg from "@/assets/news/apgm-visit-full.jpg";
import sandsImg from "@/assets/news/sands-cheque.webp";
import anniversaryImg from "@/assets/news/75th-anniversary-group.png";
import installationImg from "@/assets/news/installation-meeting-group.jpg";
import surrey2030Img from "@/assets/news/surrey-2030-gold-trophy.jpg.asset.json";
import doubleInitiationImg from "@/assets/news/double-initiation-december-2025.jpg";
import threeDegreesImg from "@/assets/news/three-masonic-degrees.jpg";
import royalArchAsset from "@/assets/news/royal-arch-meeting-room.jpg.asset.json";

import thamesChallengeImg from "@/assets/thames-challenge/tc-source-stone.jpg.asset.json";

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  image: string;
  category: string;
  href?: string;
}

// Ordered newest first
export const posts: BlogPost[] = [
  {
    slug: "walking-for-the-source",
    title: "Walking for the Source — Thames Towpath Challenge",
    date: "2026-06-25",
    category: "Charity",
    excerpt:
      "A long-distance Thames journey undertaken by Weybridge Lodge supporters — following the river back towards its source through fellowship, resilience and charitable purpose.",
    image: thamesChallengeImg.url,
    href: "/thames-challenge",
  },
  {
    slug: "royal-arch-explained",
    title: "The Royal Arch Explained — One Journey, One Organisation",
    date: "2026-06-26",
    category: "Discover Freemasonry",
    excerpt:
      "Discover the Royal Arch — the natural completion of Freemasonry's three degrees. Why UGLE calls it 'one journey, one organisation' and why every Master Mason is encouraged to consider it.",
    image: royalArchAsset.url,
  },
  {
    slug: "three-masonic-degrees-explained",
    title: "The Three Masonic Degrees Explained",
    date: "2026-06-25",
    category: "Discover Freemasonry",
    excerpt:
      "A clear, modern guide to the three degrees of Freemasonry — Entered Apprentice, Fellow Craft and Master Mason — and what each one means for a new member of Weybridge Lodge.",
    image: threeDegreesImg,
  },
  {
    slug: "surrey-2030-festival-gold",
    title: "Weybridge Lodge Strikes Gold: Surrey 2030 Festival Success",
    date: "2025-05-10",
    category: "Charity",
    excerpt:
      "Weybridge Lodge has officially secured the prestigious Gold Festival Award for the Surrey 2030 Festival, raising over £15,800 for the Masonic Charitable Foundation in just five months.",
    image: surrey2030Img,
  },
  {
    slug: "pgm-visit-february-2026",
    title: "PGM Official Visit to Weybridge Lodge February 2026",
    date: "2026-02-19",
    category: "Lodge Meetings",
    excerpt:
      "Weybridge Lodge was honoured to welcome the Provincial Grand Master of Surrey for an official visit and First Degree Initiation ceremony at the Guildford Masonic Centre.",
    image: apgmVisitImg,
  },
  {
    slug: "double-initiation-december-2025",
    title: "Double Initiation at Weybridge Lodge — December 2025",
    date: "2025-12-10",
    category: "Lodge Meetings",
    excerpt:
      "Weybridge Lodge welcomed two new Brethren — Bro. Jesse and Bro. Josh Bishop — at a memorable double First Degree Initiation on 10 December 2025.",
    image: doubleInitiationImg,
  },
  {
    slug: "sands-charity",
    title: "Weybridge Lodge Raise £31,000 for SANDS Charity",
    date: "2024-12-12",
    category: "Charity",
    excerpt:
      "In a testament to the power of community and compassion, Weybridge Masonic Lodge has helped raise a staggering £31,331.15 in support of Sands through the Lodge's Ladies Festival.",
    image: sandsImg,
  },
  {
    slug: "75th-anniversary",
    title: "Special Masonic Meeting For 75th Anniversary February 2024",
    date: "2024-02-28",
    category: "Lodge Meetings",
    excerpt:
      "The founders of Weybridge Lodge would be proud to see that what they started 75 years ago is still going strong. On Wednesday 21st February we celebrated our 75th anniversary at our 374th Regular Masonic Meeting.",
    image: anniversaryImg,
  },
  {
    slug: "installation-meeting-october-2023",
    title: "Masonic Installation Meeting October 2023",
    date: "2023-10-31",
    category: "Lodge Meetings",
    excerpt:
      "Well, it's that time of year again that gets every Masonic Lodge excited… the Masonic Installation Meeting for a new Master of the Lodge and in this instance the honour was bestowed to W Bro. Murray Grubb Jnr.",
    image: installationImg,
  },
];

export const categories = [...new Set(posts.map((p) => p.category))];

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
