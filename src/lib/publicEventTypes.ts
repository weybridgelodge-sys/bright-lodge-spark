// Shared public-event shape. Deliberately free of runtime imports so build-time
// code (the static-meta Vite plugin and its JSON-LD builder) can use the type
// without dragging the browser database client into the node typecheck.

export type PublicEvent = {
  id: string;
  slug: string;
  public_title: string;
  name: string;
  tagline: string | null;
  intro_copy: string | null;
  theme: "christmas" | "default";
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  booking_deadline: string | null;
  capacity: number | null;
  adult_price_pence: number | null;
  child_price_pence: number | null;
  hosting_lodges: string[];
  highlights: string[];
  dress_code: string | null;
  seats_taken: number;
  useful_stuff: { parking?: string; timings?: string; access?: string };
  menu_items: string[];
  dietary_choices: string[];
  event_type?: string | null;
  modules?: unknown;
  fee_cover_enabled?: boolean | null;
  payment_mode?: string | null;
  deposit_percent?: number | null;
  balance_due_date?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image_url?: string | null;
};
