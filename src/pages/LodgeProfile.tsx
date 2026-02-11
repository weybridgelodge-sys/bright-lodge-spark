import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const meetingDates = [
  "3rd Wednesday in February",
  "2nd Wednesday in March",
  "2nd Wednesday in May (LoI Festival)",
  "3rd Wednesday in October (Installation)",
  "2nd Wednesday in December",
];

const LodgeProfile = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <PageHeader
          title="Lodge Profile"
          subtitle="Introducing Weybridge Lodge No. 6787"
        />

        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="h-0.5 w-16 bg-gold mb-6" />
              <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-6">A Brief Overview</h2>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                Weybridge Lodge No. 6787 is a Lodge of Freemasons in Guildford, Surrey. Founded by members of Noel Money Lodge and workers from the Vickers Armstrong factory in Weybridge, it was Consecrated on January 29th, 1949.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed">
                Early membership was heavily influenced by Vickers factory workers and local shopkeepers of Weybridge town. However, since then membership has changed substantially. Today the Lodge has members in a wide spectrum of occupations and ages.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-navy-gradient">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-gold text-sm font-sans uppercase tracking-wide mb-2">Meeting Schedule</p>
              <h2 className="text-2xl md:text-3xl font-serif text-primary-foreground mb-6">When Do We Meet?</h2>
              <p className="text-primary-foreground/70 font-sans leading-relaxed mb-8">
                Our Lodge meets at the South West Surrey Masonic Centre for Freemasons in Guildford, Surrey. We hold five meetings each year which usually start at 5pm.
              </p>
              <ul className="space-y-3">
                {meetingDates.map((date) => (
                  <li key={date} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                    <span className="text-primary-foreground/80 font-sans">{date}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="h-0.5 w-16 bg-gold mb-6" />
              <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-6">A Lodge Built on Quality</h2>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                We currently have 20 members (including 2 honorary) whose ages range from 32 to 80. Weybridge Lodge prides itself on its friendliness to new members and visitors.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                The Lodge has a long-established reputation for the quality of its ceremonies. This is due in no small part to the very active Class (or Lodge) of Instruction (LoI). Being strongly supported by all, especially the more senior brethren, enables us to guide, mentor and entertain our newer members.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                The Class of Instruction meets every Thursday at 7.30pm in the South West Surrey Masonic Centre, Guildford. These weekly learning sessions culminate in an annual LoI Festival where the lodge meeting is handed over to and run entirely by our newer members.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-12"
            >
              <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-6">The Social Side</h2>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                As a Lodge we enjoy many activities together both charitable and social. Our main fundraiser is an annual charity gala. The money raised is donated to a charity close to the heart of the Master of the Lodge.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed">
                More relaxed activities include darts nights, Topgolf, clay pigeon shoots and our Annual Charity Golf Day. We keep our December meeting specifically for initiating new members, complete with Christmas hats and festive carols at the dinner.
              </p>
            </motion.div>

            <div className="mt-12 text-center">
              <Link
                to="/join-us"
                className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Join Weybridge Lodge
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LodgeProfile;
