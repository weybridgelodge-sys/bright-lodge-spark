import { describe, expect, it } from "vitest";
import { buildEventSeo } from "@/lib/eventSeo";
import { DEFAULT_VENUE, type PublicEvent } from "@/lib/publicEvents";

const ev = {
  id: "e", slug: "festival-2027", public_title: "Festival 2027", name: "Festival", tagline: "A night", intro_copy: null, theme: "default",
  event_date: "2027-08-14", start_time: "18:30:00", end_time: "23:30:00", venue: null, booking_deadline: null, capacity: 100,
  adult_price_pence: 7500, child_price_pence: 3000, hosting_lodges: ["Weybridge Lodge"], highlights: [], dress_code: null, seats_taken: 0,
  useful_stuff: {}, menu_items: [], dietary_choices: [],
} as PublicEvent;

describe("buildEventSeo", () => {
  it("uses the event's own SEO title and description when set", () => {
    const s = buildEventSeo({ ...ev, seo_title: "Custom title", seo_description: "Custom description" }, { open: true });
    expect(s.title).toBe("Custom title");
    expect(s.description).toBe("Custom description");
  });
  it("falls back to the public title and generated sentence", () => {
    const s = buildEventSeo(ev, { open: true });
    expect(s.title).toBe("Festival 2027");
    expect(s.description).toMatch(/^Festival 2027 on Saturday,? 14 August 2027/);
  });
  it("prices become an AggregateOffer from lowest to highest", () => {
    const o = (buildEventSeo(ev, { open: false }).jsonLd as any).offers;
    expect([o["@type"], o.lowPrice, o.highPrice, o.availability]).toEqual(["AggregateOffer", "30.00", "75.00", "https://schema.org/SoldOut"]);
  });
  it("structured Guildford address only for the default venue", () => {
    expect((buildEventSeo({ ...ev, venue: DEFAULT_VENUE }, { open: true }).jsonLd as any).location.address.postalCode).toBe("GU2 4DR");
    expect((buildEventSeo({ ...ev, venue: "Oatlands Park Hotel, Weybridge" }, { open: true }).jsonLd as any).location).toEqual({ "@type": "Place", name: "Oatlands Park Hotel", address: "Oatlands Park Hotel, Weybridge" });
  });
  it("includes the image only when there is one", () => {
    expect((buildEventSeo(ev, { open: true }).jsonLd as any).image).toBeUndefined();
    expect((buildEventSeo(ev, { open: true, imageUrl: "https://x/i.png" }).jsonLd as any).image).toEqual(["https://x/i.png"]);
  });
});
