// Event page meta + JSON-LD, built only from event data (nothing event-specific in code).
import { CHILD_MAX_AGE, DEFAULT_VENUE, formatEventDate } from "./publicEventFormat";
import type { PublicEvent } from "./publicEventTypes";

const SITE = "https://weybridgelodge.org.uk";

export function buildEventSeo(ev: PublicEvent, opts: { open: boolean; imageUrl?: string }) {
  const title = ev.public_title;
  const venue = ev.venue?.trim() || DEFAULT_VENUE;
  const auto = `${title} on ${formatEventDate(ev.event_date)} at Guildford Masonic Centre, GU2 4DR. Hosted by ${ev.hosting_lodges.join(" and ") || "Weybridge Lodge No. 6787"} — Freemasons in Guildford. Book online.`.slice(0, 300);
  const url = `${SITE}/events/${ev.slug}`;
  // The structured Guildford address applies only when the venue is the default one.
  const location = venue === DEFAULT_VENUE
    ? { "@type": "Place", name: "Guildford Masonic Centre", address: { "@type": "PostalAddress", streetAddress: "Weybourne House, Hitherbury Close", addressLocality: "Guildford", addressRegion: "Surrey", postalCode: "GU2 4DR", addressCountry: "GB" } }
    : { "@type": "Place", name: venue.split(",")[0].trim(), address: venue };
  const prices = [ev.adult_price_pence, ev.child_price_pence].filter((p): p is number => p != null);
  const offers = prices.length ? {
    "@type": "AggregateOffer", priceCurrency: "GBP", url,
    lowPrice: (Math.min(...prices) / 100).toFixed(2), highPrice: (Math.max(...prices) / 100).toFixed(2), offerCount: prices.length,
    availability: opts.open ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    description: `Adult and child (aged ${CHILD_MAX_AGE} and under) tickets`,
  } : null;
  const startDate = ev.start_time ? `${ev.event_date}T${ev.start_time.slice(0, 5)}` : ev.event_date;
  return {
    title: ev.seo_title?.trim() || title,
    description: ev.seo_description?.trim() || auto,
    image: opts.imageUrl,
    jsonLd: {
      "@context": "https://schema.org", "@type": "Event", name: title, url, startDate,
      ...(ev.end_time && { endDate: `${ev.event_date}T${ev.end_time.slice(0, 5)}` }),
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      description: ev.seo_description?.trim() || ev.tagline || ev.intro_copy || title,
      location,
      ...(opts.imageUrl && { image: [opts.imageUrl] }),
      organizer: ev.hosting_lodges.map((n) => ({ "@type": "Organization", name: n })),
      ...(offers && { offers }),
    },
  };
}
