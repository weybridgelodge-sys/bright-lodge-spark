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
      "I joined Weybridge Lodge 6787 in December with no prior connection to Freemasonry, and from the first time meeting everyone I felt genuinely welcomed. The lodge meets at the Guildford Masonic Centre, and the brethren have been consistently supportive. I’m glad I joined.",
    name: "Jesse B",
    role: "Joined aged 32",
    joined: "Member since 2025",
  },
  {
    quote:
      "I was interested in joining freemasonry for years, but a fear of the unknown prevented me. When I eventually reached out with my interest, I was invited to come along for an informal chat. Straight away, I met a bunch of amazing, warm and friendly gents who I immediately I knew I wanted to connect with! Becoming newly initiated, I kicked myself for not having done it sooner! This journey has taught me self enlightenment, and a strive for community betterment, and I have seen introverted people learn amazing attributes such as confident public speaking and presentation delivery. For anyone unsure, or thinking about it, do it now!!!",
    name: "Steve B",
    role: "Joined aged 39",
    joined: "Member since 2026",
  },
  {
    quote:
      "I have been a Freemason and a member of Weybridge Lodge 6787 for nearly 50 years. During this time, freemasonry has changed to meet the needs of the time. It has always remained relevant, and it maintains appropriate threads of tradition whilst seeking to embrace the needs of its members and those who seek to join. Weybridge Lodge is based in Guildford at the Guildford Masonic Centre, and the meetings and dinners afterwards are always memorable. I highly recommend this Lodge to anyone curious about Freemasonry in Surrey.",
    name: "Tony M",
    role: "Joined aged 31",
    joined: "Member since 2008",
  },
];
