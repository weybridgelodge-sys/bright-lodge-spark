import sandsImg from "@/assets/news/sands-cheque.webp";
import anniversaryImg from "@/assets/news/75th-anniversary-group.png";
import installationImg from "@/assets/news/installation-meeting-group.jpg";

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  image: string;
  category: string;
}

// Ordered newest first
export const posts: BlogPost[] = [
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
