// Generated/curated member testimonials.
// To replace the placeholder content, edit this file directly, OR run:
//   node scripts/import-testimonials.mjs scripts/testimonials.csv
// which will rewrite this file from a CSV of real testimonials.
// See scripts/TESTIMONIALS_GUIDE.md for the collection process and consent template.

export interface Testimonial {
  quote: string;
  name: string;
  role: string;     // e.g. "Joined aged 34"
  joined: string;   // e.g. "Member since 2022"
}

export const testimonials: Testimonial[] = [
  {
    quote:
      "I'd always been curious but assumed it wasn't for someone like me. Three years in, it's the best decision I've made — proper friendships and a genuine sense of purpose.",
    name: "[Member Name]",
    role: "Joined aged 34",
    joined: "Member since 2022",
  },
  {
    quote:
      "What surprised me most was how normal everyone was. No secret handshakes on day one, no pressure — just a good meal and good company. I felt at home from the first visit.",
    name: "[Member Name]",
    role: "Joined aged 41",
    joined: "Member since 2020",
  },
  {
    quote:
      "I joined later in life thinking I'd missed the boat. The Lodge welcomed me like I'd always been part of it. The charity work alone has made it worthwhile.",
    name: "[Member Name]",
    role: "Joined aged 58",
    joined: "Member since 2019",
  },
];
