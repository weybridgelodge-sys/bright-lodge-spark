import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { Link } from "react-router-dom";
import { CalendarDays, Info, Mail } from "lucide-react";
import type { RegisterMeeting } from "@/lib/lodgeEvents";

const fmtDate = (isoDate: string) =>
  new Date(isoDate + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Shown on /bookings when there is no future-dated published bookable meeting.
 * Lists every upcoming meeting from the Meetings Register (date + sanitised
 * ceremony label only), or an honest "check back soon" message when nothing
 * is scheduled. No booking form in this state.
 */
const SaveTheDate = ({ meetings }: { meetings: RegisterMeeting[] }) => {
  const hasMeetings = meetings.length > 0;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Dining & Bookings | Weybridge Lodge No. 6787 — Guildford Masonic Centre"
        description="Upcoming Weybridge Lodge meetings at the Guildford Masonic Centre, Guildford GU2 4DR. Full booking details are published closer to each date."
        canonical="/bookings"
        type="website"
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Bookings", url: "/bookings" },
          ]),
        ]}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />

      <main id="main-content">
        <PageHeader
          title="Dining & Bookings"
          subtitle="Our upcoming meetings at the Guildford Masonic Centre, GU2 4DR"
        />

        <section className="py-20 md:py-28 bg-background" aria-labelledby="save-the-date-heading">
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
            <div className="h-px w-16 bg-gold mb-6" aria-hidden="true" />

            {hasMeetings ? (
              <>
                <h2 id="save-the-date-heading" className="text-2xl md:text-3xl font-serif text-foreground mb-6">
                  Save the Date
                </h2>

                <ul className="space-y-4 mb-8 list-none p-0">
                  {meetings.map((m) => (
                    <li
                      key={m.meeting_date}
                      className="rounded-sm border border-border bg-card p-5 md:p-6"
                    >
                      <p className="flex items-start gap-3 text-base md:text-lg font-serif text-foreground">
                        <CalendarDays className="w-5 h-5 text-gold mt-1 shrink-0" aria-hidden="true" />
                        <span>
                          {fmtDate(m.meeting_date)}
                          {m.ceremony ? <> — {m.ceremony}</> : null}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>

                <p className="flex items-start gap-3 text-muted-foreground font-sans leading-relaxed mb-6">
                  <Info className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    Full booking details — the festive board menu, dining options, dress code and the
                    booking form itself — will be published on this page closer to each date. Please do
                    check back nearer the time.
                  </span>
                </p>
              </>
            ) : (
              <>
                <h2 id="save-the-date-heading" className="text-2xl md:text-3xl font-serif text-foreground mb-6">
                  Our Next Meeting
                </h2>
                <p className="flex items-start gap-3 text-muted-foreground font-sans leading-relaxed mb-6">
                  <Mail className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    Details of our next meeting will be published here shortly. Please check back soon or{" "}
                    <Link to="/contact" className="text-gold underline underline-offset-4">
                      contact the Assistant Secretary
                    </Link>
                    .
                  </span>
                </p>
              </>
            )}

            <Link
              to="/events"
              aria-label="View the full calendar of upcoming events at Weybridge Lodge No. 6787"
              className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors min-h-[48px]"
            >
              View the Full Calendar
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SaveTheDate;
