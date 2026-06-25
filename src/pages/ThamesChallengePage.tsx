import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO, { articleSchema, breadcrumbSchema } from "@/components/SEO";
import RelatedPosts from "@/components/RelatedPosts";
import SocialShare from "@/components/SocialShare";
import CommentsSection, { commentCount } from "@/components/CommentsSection";
import { motion } from "framer-motion";
import { Calendar, Footprints, HeartPulse, MapPinned, Users, ArrowRight, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import barrierDawn from "@/assets/thames-challenge/tc-barrier-dawn.jpg.asset.json";
import barrierGantry from "@/assets/thames-challenge/tc-barrier-gantry.jpg.asset.json";
import sourceStone from "@/assets/thames-challenge/tc-source-stone.jpg.asset.json";
import thamesPathSign from "@/assets/thames-challenge/tc-thames-path-sign.jpg.asset.json";
import oxfordBridge from "@/assets/thames-challenge/tc-oxford-bridge.jpg.asset.json";
import cricklade from "@/assets/thames-challenge/tc-cricklade.jpg.asset.json";
import newbridgeWillows from "@/assets/thames-challenge/tc-newbridge-willows.jpg.asset.json";
import abingdonSelfie from "@/assets/thames-challenge/tc-abingdon-selfie.jpg.asset.json";
import roseRevived from "@/assets/thames-challenge/tc-rose-revived.jpg.asset.json";
import maidenheadBridge from "@/assets/thames-challenge/tc-maidenhead-bridge.jpg.asset.json";
import putneyGroup from "@/assets/thames-challenge/tc-putney-group.jpg.asset.json";
import henleyGroup from "@/assets/thames-challenge/tc-henley-group.jpg.asset.json";
import fieldsSelfie from "@/assets/thames-challenge/tc-fields-selfie.jpg.asset.json";
import threeAmigosRiver from "@/assets/thames-challenge/tc-three-amigos-river.jpg.asset.json";
import pubPints from "@/assets/thames-challenge/tc-pub-pints.jpg.asset.json";
import stormDog from "@/assets/thames-challenge/tc-storm-dog.jpg.asset.json";
import leboat from "@/assets/thames-challenge/tc-leboat.jpg.asset.json";
import leboatGroup from "@/assets/thames-challenge/tc-leboat-group.jpg.asset.json";

const URL = "/thames-challenge";
const TITLE = "Walking for the Source — Thames Towpath Challenge";
const DESCRIPTION =
  "Follow Weybridge Lodge No. 6787 on the Thames Towpath Challenge — a long-distance charity walk from London to the source, told through the people, places, setbacks and determination behind the miles.";

const stats = [
  {
    icon: Footprints,
    label: "Challenge focus",
    value: "Source-bound",
    detail: "A long-distance Thames journey undertaken in stages, from London back towards the river's beginning.",
  },
  {
    icon: MapPinned,
    label: "Route story",
    value: "Capital to Cotswolds",
    detail: "From the barrier and bridges of London to the quieter reaches around Cricklade and the source stone.",
  },
  {
    icon: Users,
    label: "Team spirit",
    value: "Lodge effort",
    detail: "Brethren, family and friends all playing their part — walking, supporting, encouraging and sharing the load.",
  },
  {
    icon: HeartPulse,
    label: "Why it mattered",
    value: "Charity with purpose",
    detail: "A physically demanding act of support, friendship and fundraising rooted in real community care.",
  },
];

const timeline = [
  {
    title: "London — the challenge takes shape",
    text:
      "The story begins in the capital, where the early miles were framed by the familiar landmarks of the working Thames — barrier structures, embankments and bridges. It was an urban start, but it set the tone: this would be a serious undertaking, taken one section at a time and shared by a determined team.",
    image: barrierDawn.url,
    alt: "Challenge team gathered by the river near an old stone bridge at dawn during the London section of the Thames walk",
    caption: "Early on the route — tired legs still fresh enough for smiles.",
  },
  {
    title: "Middle reaches — rhythm, weather and river life",
    text:
      "As the route unfolded upstream, the walk settled into a rhythm of bridges, towpaths, changing weather and steady companionship. Some stretches were open and expansive, others muddy, exposed or unexpectedly testing. The river kept changing character, and the team had to change with it.",
    image: maidenheadBridge.url,
    alt: "Walking group by the Thames near Maidenhead Bridge during an overcast stage of the challenge",
    caption: "The Thames in transition — broader water, greyer skies and steady progress.",
  },
  {
    title: "Upper Thames — quieter miles, stronger resolve",
    text:
      "Further upstream the scenery softened. Villages, willow-lined banks and quieter waters brought a different kind of challenge: long, honest mileage without much fuss or spectacle. These were the stretches where resolve mattered most and where the companionship of the group carried real weight.",
    image: newbridgeWillows.url,
    alt: "Weybridge Lodge walkers posed under willow trees beside the Thames near Newbridge",
    caption: "Newbridge — one of the calmer, greener moments on the route.",
  },
  {
    title: "The source — a simple, memorable finish",
    text:
      "Eventually the walk reaches the symbolic end point: the source stone. There is nothing grand or theatrical about it — and perhaps that is exactly the point. After all the miles, fellowship and effort, the finish is quiet, human and deeply satisfying. The achievement belongs not to one person, but to everyone who took part and helped get the team there.",
    image: sourceStone.url,
    alt: "Walker beside the Thames source stone and signpost marking the end of the route",
    caption: "At the source stone — where the river begins and the story resolves.",
  },
];

const people = [
  {
    title: "The walkers",
    text:
      "The challenge was carried by people willing to put one foot in front of the other over and over again — not for applause, but because shared effort matters. Some stages were tougher than expected, but the group kept showing up.",
    image: barrierGantry.url,
    alt: "Small team selfie on a gantry above the river during the Thames challenge",
  },
  {
    title: "The support network",
    text:
      "Every endurance effort depends on more than the walkers themselves. Encouragement, lifts, planning, check-ins, refreshments and morale all played a part. That wider circle is visible throughout the story of the challenge.",
    image: leboatGroup.url,
    alt: "Supporters and walkers together on a river boat during the Thames challenge",
  },
  {
    title: "The moments between the miles",
    text:
      "Not every memory came from the hardest sections. Some came from the pauses — riverside photos, regrouping points, a pint at the end of a long day, or simply laughing when the weather or terrain had other ideas.",
    image: pubPints.url,
    alt: "Group enjoying celebratory drinks after a walking stage of the Thames challenge",
  },
];

const gallery = [
  { src: thamesPathSign.url, alt: "Thames Path sign marking the route of the walking challenge", caption: "The path itself — a route with its own character from start to finish." },
  { src: oxfordBridge.url, alt: "Historic Oxford bridge and river scene on the Thames Towpath Challenge", caption: "Oxford — architecture, river traffic and another chapter in the walk." },
  { src: cricklade.url, alt: "Cricklade section of the Thames Towpath Challenge", caption: "Cricklade — where the river begins to feel markedly different." },
  { src: abingdonSelfie.url, alt: "Group selfie beside the river in Abingdon during the challenge", caption: "Abingdon — a bright stage, strong spirits and another milestone." },
  { src: roseRevived.url, alt: "Walking team outside The Rose Revived during the challenge", caption: "A proper regrouping point on the route." },
  { src: putneyGroup.url, alt: "Team group photo in Putney during the Thames challenge", caption: "Urban river miles at the London end of the journey." },
  { src: henleyGroup.url, alt: "Group of walkers together in Henley during the challenge", caption: "Henley — one more stretch, one more set of memories." },
  { src: fieldsSelfie.url, alt: "Selfie in open fields during a rural stage of the Thames walk", caption: "Away from the towns, the path opened out into quieter country." },
  { src: threeAmigosRiver.url, alt: "Three walkers beside the river during the Thames challenge", caption: "Smaller groups, same purpose." },
  { src: stormDog.url, alt: "Dog photographed during stormy conditions on the Thames challenge", caption: "Even the difficult conditions produced unforgettable images." },
  { src: leboat.url, alt: "Boat on the Thames used as part of the support story around the challenge", caption: "The river was not just backdrop — it shaped the whole feel of the challenge." },
];

const ThamesChallengePage = () => {
  return (
    <div className="min-h-screen bg-warm-white">
      <SEO
        title={TITLE}
        description={DESCRIPTION}
        canonical={URL}
        type="article"
        schema={[
          articleSchema({
            title: TITLE,
            description: DESCRIPTION,
            date: "2026-06-25",
            url: URL,
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Our Charities", url: "/our-charities" },
            { name: "Walking for the Source", url: URL },
          ]),
        ]}
      />

      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <section className="relative overflow-hidden bg-navy-dark pt-32 pb-20 md:pt-40 md:pb-28">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${sourceStone.url})` }}
            role="img"
            aria-label="Walker at the Thames source stone completing the challenge"
          />
          <div className="absolute inset-0 bg-navy-gradient opacity-90" />

          <div className="relative z-10 container mx-auto px-4 sm:px-6 max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl"
            >
              <Link to="/news" className="mb-6 inline-flex items-center gap-2 text-sm font-sans text-primary-foreground/80 hover:text-gold transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to News
              </Link>
              <p className="mb-4 text-xs font-mono uppercase tracking-[0.3em] text-gold/90">Thames Towpath Challenge</p>
              <h1 className="font-serif text-4xl leading-tight text-primary-foreground sm:text-5xl md:text-6xl">
                Walking for the Source
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-sans leading-relaxed text-primary-foreground/80 md:text-xl">
                A long-distance Thames journey told through fellowship, resilience and the quiet determination to do something difficult for a good cause.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-primary-foreground/75">
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> 25 June 2026</span>
                <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> Weybridge Lodge No. 6787</span>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-warm-white py-16 md:py-24">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <SocialShare url={URL} title={TITLE} commentCount={commentCount} />

            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <article className="prose-custom max-w-none space-y-10">
                <section>
                  <div className="mb-6 h-0.5 w-16 bg-gold" />
                  <h2 className="mb-4 font-serif text-3xl text-foreground">A river, in reverse</h2>
                  <p className="font-sans leading-relaxed text-muted-foreground">
                    The Thames is usually imagined one way: from its modest beginnings in the Cotswolds out towards London, bridges, landmarks and the sea. This challenge told the story the other way round. It followed the river back towards its source, asking the team to move from the familiar to the elemental, from built-up embankments to open country, and from spectacle to something simpler.
                  </p>
                  <p className="mt-4 font-sans leading-relaxed text-muted-foreground">
                    That reversal gives the walk its emotional force. Every stage strips something back. The crowds thin, the water narrows, the route quietens, and what remains is effort, companionship and purpose. By the time the source stone is reached, the achievement feels earned in a very human way.
                  </p>
                  <figure className="mt-8">
                    <img src={barrierDawn.url} alt="Challenge team gathered by the river in the early stages of the Thames walk" className="w-full rounded-sm border border-border object-cover" />
                    <figcaption className="mt-2 text-center font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Early section — the walk begins in the city but never stays there.
                    </figcaption>
                  </figure>
                </section>

                <section>
                  <div className="mb-6 h-0.5 w-16 bg-gold" />
                  <h2 className="mb-4 font-serif text-3xl text-foreground">More than mileage</h2>
                  <p className="font-sans leading-relaxed text-muted-foreground">
                    A challenge like this is measured in miles, but it is never only about distance. It is about turning goodwill into action. It is about showing up for something worthwhile, sustaining one another when energy dips, and proving that charity is not always glamorous. Often it is practical, inconvenient, weather-beaten and quietly stubborn.
                  </p>
                  <p className="mt-4 font-sans leading-relaxed text-muted-foreground">
                    The Thames Towpath Challenge captured all of that. It joined physical exertion to fundraising purpose, but it also revealed something more personal: the kind of bonds that are built when people decide to do hard things together.
                  </p>
                </section>

                <section className="rounded-sm border border-gold/25 bg-gold/5 p-6 md:p-8">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold">Medical note</p>
                  <h2 className="mt-3 font-serif text-2xl text-foreground">A challenge shaped by health as well as endurance</h2>
                  <p className="mt-4 font-sans leading-relaxed text-muted-foreground">
                    Long-distance walking stories can sound effortless when reduced to photos and milestones. They never are. Real-life challenges unfold alongside ordinary pressures, personal responsibilities and, for some participants, genuine health considerations. That context matters.
                  </p>
                  <p className="mt-4 font-sans leading-relaxed text-muted-foreground">
                    This page is therefore not written as a tale of superhuman endurance. It is written as a record of care, realism and determination — of people respecting limits where needed, supporting each other properly, and still finding a way to move the mission forward.
                  </p>
                </section>

                <section>
                  <div className="mb-6 h-0.5 w-16 bg-gold" />
                  <h2 className="mb-4 font-serif text-3xl text-foreground">Feature gallery</h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    {gallery.slice(0, 6).map((item) => (
                      <figure key={item.src} className="overflow-hidden rounded-sm border border-border bg-card">
                        <img src={item.src} alt={item.alt} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                        <figcaption className="px-4 py-3 text-sm font-sans text-muted-foreground">{item.caption}</figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              </article>

              <aside className="space-y-6 lg:sticky lg:top-28">
                <div className="rounded-sm border border-border bg-card p-6">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-gold">At a glance</p>
                  <ul className="mt-4 space-y-4 text-sm font-sans text-muted-foreground">
                    <li><strong className="text-foreground">Route:</strong> London towards the source of the Thames</li>
                    <li><strong className="text-foreground">Theme:</strong> charity, endurance and fellowship</li>
                    <li><strong className="text-foreground">Format:</strong> a staged long-distance challenge</li>
                    <li><strong className="text-foreground">Outcome:</strong> a shared story the Lodge can be proud of</li>
                  </ul>
                </div>
                <div className="overflow-hidden rounded-sm border border-border bg-card">
                  <img src={thamesPathSign.url} alt="Thames Path sign showing route directions" className="w-full object-cover" loading="lazy" />
                  <div className="p-4 text-sm font-sans text-muted-foreground">
                    The route itself became part of the narrative — changing in mood, terrain and difficulty as the team worked upstream.
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="bg-navy-gradient py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-10 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-gold">Stats section</p>
              <h2 className="mt-3 font-serif text-3xl text-primary-foreground md:text-4xl">What this challenge represented</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-sm border border-gold/15 bg-navy-light/30 p-6">
                    <Icon className="h-8 w-8 text-gold" />
                    <p className="mt-4 text-xs font-mono uppercase tracking-[0.18em] text-gold/80">{stat.label}</p>
                    <h3 className="mt-2 font-serif text-2xl text-primary-foreground">{stat.value}</h3>
                    <p className="mt-3 text-sm font-sans leading-relaxed text-primary-foreground/70">{stat.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-warm-white py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-gold">Day-by-day timeline</p>
              <h2 className="mt-3 font-serif text-3xl text-foreground md:text-4xl">From London back towards the spring</h2>
            </div>
            <div className="space-y-10">
              {timeline.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.06 }}
                  className="grid gap-6 overflow-hidden rounded-sm border border-border bg-card p-6 md:grid-cols-[88px_minmax(0,1fr)_320px] md:p-8"
                >
                  <div className="font-mono text-sm uppercase tracking-[0.2em] text-gold">Stage {index + 1}</div>
                  <div>
                    <h3 className="font-serif text-2xl text-foreground">{item.title}</h3>
                    <p className="mt-4 font-sans leading-relaxed text-muted-foreground">{item.text}</p>
                  </div>
                  <figure>
                    <img src={item.image} alt={item.alt} className="aspect-[4/3] w-full rounded-sm object-cover" loading="lazy" />
                    <figcaption className="mt-2 text-sm font-sans text-muted-foreground">{item.caption}</figcaption>
                  </figure>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-warm-white pb-16 md:pb-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-gold">People section</p>
              <h2 className="mt-3 font-serif text-3xl text-foreground md:text-4xl">The people behind the miles</h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {people.map((person) => (
                <article key={person.title} className="overflow-hidden rounded-sm border border-border bg-card shadow-sm">
                  <img src={person.image} alt={person.alt} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  <div className="p-6">
                    <h3 className="font-serif text-2xl text-foreground">{person.title}</h3>
                    <p className="mt-3 font-sans leading-relaxed text-muted-foreground">{person.text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
              {gallery.slice(6).map((item) => (
                <figure key={item.src} className="overflow-hidden rounded-sm border border-border bg-card">
                  <img src={item.src} alt={item.alt} className="aspect-square w-full object-cover" loading="lazy" />
                  <figcaption className="px-4 py-3 text-sm font-sans text-muted-foreground">{item.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-navy-gradient py-16 md:py-24">
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">Support the spirit behind it</p>
            <h2 className="mt-3 font-serif text-3xl text-primary-foreground md:text-4xl">
              Charity works best when fellowship turns into action.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl font-sans leading-relaxed text-primary-foreground/75">
              The Thames Towpath Challenge is one more example of how Weybridge Lodge tries to put values into practice — quietly, generously and together.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/our-charities"
                className="inline-flex items-center justify-center bg-gold-shimmer px-8 py-4 text-sm font-semibold uppercase tracking-widest text-accent-foreground transition-opacity hover:opacity-90 rounded-sm"
              >
                Explore Our Charities <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                to="/join-us"
                className="inline-flex items-center justify-center rounded-sm border border-primary-foreground/30 px-8 py-4 text-sm font-sans uppercase tracking-widest text-primary-foreground transition-colors hover:border-gold hover:text-gold"
              >
                Join Weybridge Lodge
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-warm-white py-16 md:py-20">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <CommentsSection pageSlug="thames-challenge" title={TITLE} />
            <RelatedPosts currentSlug="walking-for-the-source" category="Charity" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ThamesChallengePage;
