import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Venue is a genuinely fixed fact, not something that changes per meeting.
const VENUE_NAME = "Guildford Masonic Centre";
const VENUE_ADDRESS = "Hitherbury Close, Guildford GU2 4DR";

/** Public-safe slice of the Meetings Register via public_lodge_meetings. */
interface PublicMeeting {
  title: string;
  event_date: string;
  tyling_time: string | null;
  description: string | null;
}

/** Long-form date, London time — e.g. "Wednesday, 21 October 2026". */
function formatLondonDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

const NextMeeting = () => {
  const [meeting, setMeeting] = useState<PublicMeeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    (supabase as any)
      .from("public_lodge_meetings")
      .select("title,event_date,tyling_time,description")
      .gte("event_date", startOfToday.toISOString())
      .order("event_date", { ascending: true })
      .limit(1)
      .then(({ data, error }: any) => {
        if (!alive) return;
        setMeeting(!error && data?.[0] ? (data[0] as PublicMeeting) : null);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Between cycles — no published meeting — the section is hidden entirely.
  // The homepage feed above already lists what's coming up.
  if (!loading && !meeting) return null;

  return (
    <section id="meeting" className="py-24 md:py-32 bg-warm-white" aria-busy={loading}>
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-4">
            Our Next Meeting
          </h2>
          <p className="text-muted-foreground font-sans mb-12">
            You are warmly invited to attend
          </p>
        </motion.div>

        {loading && (
          <div className="max-w-2xl mx-auto bg-card rounded-sm border border-border shadow-lg overflow-hidden animate-pulse" aria-hidden="true">
            <div className="bg-navy-gradient p-8 space-y-3">
              <div className="h-3 w-24 bg-primary-foreground/20 rounded mx-auto" />
              <div className="h-7 w-3/4 bg-primary-foreground/20 rounded mx-auto" />
              <div className="h-3 w-1/2 bg-primary-foreground/20 rounded mx-auto" />
            </div>
            <div className="p-8 space-y-6">
              <div className="h-4 w-2/3 bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted rounded" />
            </div>
          </div>
        )}

        {!loading && meeting && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="max-w-2xl mx-auto bg-card rounded-sm border border-border shadow-lg overflow-hidden"
          >
            <div className="bg-navy-gradient p-8 text-center">
              <p className="text-gold uppercase tracking-widest text-sm font-sans mb-2">
                Lodge Meeting
              </p>
              <h3 className="text-2xl md:text-3xl font-serif text-primary-foreground leading-snug">
                {meeting.title}
              </h3>
              <p className="text-primary-foreground/60 font-sans text-sm mt-2">
                {formatLondonDate(meeting.event_date)}
              </p>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-start gap-4">
                <Calendar className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-sans font-medium text-foreground">
                    {meeting.tyling_time || formatLondonDate(meeting.event_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-sans font-medium text-foreground">{VENUE_NAME}</p>
                  <p className="text-sm text-muted-foreground font-sans">{VENUE_ADDRESS}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Clock className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-sans font-medium text-foreground">Now open for bookings</p>
                  <p className="text-sm text-muted-foreground font-sans">
                    Reserve your place using the button below
                  </p>
                </div>
              </div>

              {meeting.description && (
                <p className="text-sm text-muted-foreground font-sans leading-relaxed whitespace-pre-line pt-2 border-t border-border">
                  {meeting.description}
                </p>
              )}

              <a
                href="/bookings"
                className="block w-full text-center bg-gold-shimmer text-accent-foreground py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity mt-4"
              >
                Book Your Place
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default NextMeeting;
