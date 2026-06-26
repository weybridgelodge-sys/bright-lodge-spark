import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import vickersImg from "@/assets/history/vickers-factory.png";
import honoraryImg from "@/assets/history/honorary-members.jpg";
import foundersImg from "@/assets/history/lodge-founders.jpg";
import highStreetAsset from "@/assets/history/weybridge-high-street-1950s.png.asset.json";
import masonicCentreAsset from "@/assets/history/sw-surrey-masonic-centre.png.asset.json";

const Section = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`py-20 md:py-28 ${className}`}>
    <div className="container mx-auto px-6 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {children}
      </motion.div>
    </div>
  </section>
);

const History = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Lodge History | Freemasons in Guildford, Surrey"
        description="Discover the history of Weybridge Lodge No. 6787 — from wartime Brooklands and the aircraft pioneers of Vickers and Hawker, to our consecration in 1949 and life in Guildford today."
        canonical="/history"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "About Us", url: "/#about" },
          { name: "Our History", url: "/history" },
        ])}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Our History"
          subtitle="From the aircraft factories of wartime Brooklands to the heart of Guildford — seventy-five years of Weybridge Lodge No. 6787"
        />

        {/* SECTION 1 — THE WORLD THAT MADE US */}
        <Section className="bg-warm-white">
          <div className="h-0.5 w-16 bg-gold mb-6" />
          <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-6">The World That Made Us</h2>
          <p className="text-muted-foreground font-sans leading-relaxed mb-4">
            The story of Weybridge Lodge does not begin in a lodge room. It begins in the roar of aircraft engines, the rhythm of a Surrey market town, and the quiet determination of men who believed that a shared purpose — and a Wednesday afternoon — could hold a community together.
          </p>
          <p className="text-muted-foreground font-sans leading-relaxed mb-4">
            In the years before the Second World War, Weybridge was a town under pressure. An enforced merger of local councils had cost it much of its identity, and a newly electrified railway to London threatened to reduce it to what one early chronicler called a "Commuter Dormitory." The town's greatest industrial landmark, Brooklands — two miles from the High Street but woven into the fabric of local life — was home to Vickers Aviation and Hawker Aircraft, two of the biggest employers in the county.
          </p>
          <figure className="my-8">
            <img
              src={vickersImg}
              alt="The Vickers factory in Brooklands, Weybridge, Surrey from the air in about 1939"
              className="w-full rounded-sm"
              loading="lazy"
            />
            <figcaption className="text-xs text-muted-foreground text-center mt-2 italic">
              The Vickers factory at Brooklands from the air, c.1939. Image courtesy of the Spirit of Brooklands Museum.
            </figcaption>
          </figure>
          <p className="text-muted-foreground font-sans leading-relaxed mb-4">
            At Brooklands, the Hawker Hurricane made its first flight on 6 November 1935. The Vickers Wellington and Supermarine Spitfire were built and tested there. These were not abstract feats of engineering — they were the daily work of men who lived in Weybridge, shopped on the High Street, and would go on to found this Lodge.
          </p>
          <p className="text-muted-foreground font-sans leading-relaxed">
            When war came, Brooklands became a prime target. On 4 September 1940, the Vickers factory was bombed by the Luftwaffe, killing 90 workers. Two days later, the Hawker factory was also hit. The town had paid a grievous price. When peace came, the instinct to come together — to build something lasting — was stronger than ever.
          </p>
        </Section>

        {/* SECTION 2 — IN THE BEGINNING */}
        <Section className="bg-navy-gradient">
          <p className="text-gold text-sm font-sans uppercase tracking-wide mb-2">Consecrated 29th January 1949</p>
          <h2 className="text-2xl md:text-3xl font-serif text-primary-foreground mb-6">In the Beginning</h2>
          <p className="text-primary-foreground/70 font-sans leading-relaxed mb-4">
            Wednesday had been early-closing day in Weybridge since time immemorial. It was this simple fact — a Wednesday afternoon free from the counter and the workshop — that seeded the idea of a new Lodge.
          </p>
          <p className="text-primary-foreground/70 font-sans leading-relaxed mb-4">
            The concept was straightforward and, when proposed, "met with general acclaim": a Lodge meeting late on a Wednesday afternoon, accessible to businessmen, tradesmen, artisans and commuters alike. A Lodge that would serve not just Freemasons with Masonic interests, but the community itself — helping to bind together a town that risked losing its sense of place.
          </p>
          <p className="text-primary-foreground/70 font-sans leading-relaxed mb-4">
            The Weybridge Lodge No. 6787 was consecrated on 19th January 1948 under the sponsorship of our Mother Lodge, Noel Money No. 2521, from whom the Lodge also drew a number of its early members. The Warrant of Constitution was issued by the United Grand Lodge of England on 29th January 1949.
          </p>
          <p className="text-primary-foreground/70 font-sans leading-relaxed">
            The Lodge's aviation connection was honoured from the very beginning: W. Bro. Coley of Coley & Atkinson — scrap metal contractors to the aircraft industry — presented the Lodge with a handsome boxed set of Working Tools. As one account puts it, with characteristic Lodge wit: "A case of getting one's own back."
          </p>
        </Section>

        {/* SECTION 3 — THE FOUNDERS */}
        <Section className="bg-warm-white">
          <div className="h-0.5 w-16 bg-gold mb-6" />
          <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-6">The Founders — A Village in Miniature</h2>
          <p className="text-muted-foreground font-sans leading-relaxed mb-6">
            The list of founder members reads like a walk down Weybridge High Street — because that is precisely what it was.
          </p>
          <figure className="my-8">
            <img
              src={honoraryImg}
              alt="The original Honorary Members of Weybridge Lodge, 1949"
              className="w-full rounded-sm"
              loading="lazy"
            />
            <figcaption className="text-xs text-muted-foreground text-center mt-2 italic">
              The original Honorary Members of Weybridge Lodge, 1949.
            </figcaption>
          </figure>
          <p className="text-muted-foreground font-sans leading-relaxed mb-4">
            W. Bro. Roy Edmonds, the Father of the Lodge, was Works Manager at Vickers Aviation and later a Senior Executive of British Aerospace. To him, Freemasonry was "something special to be enjoyed outside works hours." He became the Lodge's First Master, and his son Freddie — described by those who knew him as "a much more flamboyant character" — was the very first Initiate, receiving his degrees on 22nd February 1949.
          </p>
          <p className="text-muted-foreground font-sans leading-relaxed mb-4">
            W. Bro. Arthur Ley was an eminent architect whose work included the preservation of St Paul's Cathedral. A man of considerable distinction, he remained one of the Lodge's humblest and most approachable supporters.
          </p>
          <p className="text-muted-foreground font-sans leading-relaxed mb-4">
            The Boyle brothers — Billy and Harry, sharing a name but nothing else — brought colour to Lodge life in entirely different ways. Harry, an under-foreman at Vickers, was a member of the Magic Circle and a brilliant amateur conjurer who performed regularly for charity and served as a riotously entertaining MC at Ladies' Festivals. Billy worked in the film industry, then centred on the studios at Walton-on-Thames and Shepperton.
          </p>
          <p className="text-muted-foreground font-sans leading-relaxed mb-4">
            On a shopping trip around the village in those early days, you could have your Income Tax sorted by Noel Mills on Monument Hill; metal fabrication of any description — including racing car bodies for the Brooklands Brigade — from Les Anstead in the Shipyard; prime cuts from the family butcher Bruce Seaman; and your groceries from the Post Office counter presided over by Monty Felmingham.
          </p>
          <p className="text-muted-foreground font-sans leading-relaxed mb-4">
            Further along, George Stacey sold everything from torch batteries to bicycles at Farrow's Radio & Cycle Shop; Bill Lewis offered motorcycles at his shop in the Quadrant; Freddie Cook sold fruit; Walter Green provided legal advice; and the Poulter family — Fred of whom became the Lodge's first Senior Warden — were among the most prominent names in Weybridge commerce.
          </p>
          <p className="text-muted-foreground font-sans leading-relaxed mb-6">
            And should any member have cause to visit the local police station at the bottom of Heath Road, they might well have been greeted by fellow member and later initiate Ken Thaine, who after retirement from the Force went on to serve with distinction as full-time Steward at Staines Masonic Centre.
          </p>
          <figure className="my-8">
            <img
              src={highStreetAsset.url}
              alt="Shoppers gathered outside Rogers of Weybridge on the High Street in the late 1940s"
              className="w-full rounded-sm"
              loading="lazy"
            />
            <figcaption className="text-xs text-muted-foreground text-center mt-2 italic">
              Weybridge High Street, late 1940s — the village that founded the Lodge.
            </figcaption>
          </figure>
          <p className="text-muted-foreground font-sans leading-relaxed mb-6">
            The Lodge's first Tyler, W. Bro. Butler, deserves special mention. An ex-Cavalryman of commanding presence, he scorned the ceremonial sword in favour of his own cavalry sabre — of such awe-inspiring dimensions, it is recorded, that Directors of Ceremonies "gave him plenty of air space at his annual investiture." To him we owe the Lodge's distinctive custom of Silent Fire after the Tyler's Toast at the Festive Board — a tradition that endures to this day.
          </p>
          <figure className="my-8">
            <img
              src={foundersImg}
              alt="Weybridge Lodge founder members, 1949"
              className="w-full rounded-sm"
              loading="lazy"
            />
            <figcaption className="text-xs text-muted-foreground text-center mt-2 italic">
              Weybridge Lodge founder members, 1949.
            </figcaption>
          </figure>
        </Section>

        {/* SECTION 4 — A LODGE ON THE MOVE */}
        <Section className="bg-navy-gradient">
          <p className="text-gold text-sm font-sans uppercase tracking-wide mb-2">1948 – 1986</p>
          <h2 className="text-2xl md:text-3xl font-serif text-primary-foreground mb-6">A Lodge on the Move</h2>
          <p className="text-primary-foreground/70 font-sans leading-relaxed mb-4">
            Finding a permanent Masonic home proved, in the early years, something of an adventure. The Lodge held its first meetings at the Oatlands Park Hotel and St George's Hill Tennis Club, acquiring its own Masonic furniture, collars, tracing boards and — in a detail that says much about the Lodge's spirit — a set of distinctive perspex nameplates for the Festive Board.
          </p>
          <p className="text-primary-foreground/70 font-sans leading-relaxed mb-4">
            After a few years, the Lodge settled at Chertsey Masonic Centre, where it remained for some ten years. Chertsey had its qualities, but also its challenges: parking on the road outside grew contentious as car ownership increased; the kitchen facilities required food to be brought in from outside; the bar had to be assembled and dismantled before and after every meeting; and the heating system failed "with monotonous regularity." As one account records with admirable understatement, meetings conducted in overcoats were considered tolerable — "just" — but "an unheated floor in the third degree can almost result in hypothermia."
          </p>
          <p className="text-primary-foreground/70 font-sans leading-relaxed mb-6">
            The catering, however, had its consolations. Several tradesmen members supplemented the table from their own stocks, and at one particularly memorable Installation, there was reportedly so much fruit on the table that "a toga rather than a dark suit would have been more appropriate."
          </p>
          <figure className="my-8">
            <img
              src={masonicCentreAsset.url}
              alt="The entrance gates of the South West Surrey Masonic Centre, Guildford"
              className="w-full rounded-sm"
              loading="lazy"
            />
            <figcaption className="text-xs text-primary-foreground/50 text-center mt-2 italic">
              The South West Surrey Masonic Centre, Guildford — the Lodge's home since 1986.
            </figcaption>
          </figure>
          <p className="text-primary-foreground/70 font-sans leading-relaxed">
            The Lodge moved next to Surbiton Masonic Centre — warmer, better equipped, with an in-house bar and catering — before making its final move to its present home at the South West Surrey Masonic Centre, Guildford in 1986; a move which, as the Lodge's own historian noted, "virtually severed the last links with the town of Weybridge," but opened a new chapter in a new community.
          </p>
        </Section>

        {/* SECTION 5 — 1988 SNAPSHOT */}
        <Section className="bg-warm-white">
          <div className="h-0.5 w-16 bg-gold mb-6" />
          <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-6">The Lodge in 1988 — A Glimpse from the Archive</h2>
          <p className="text-muted-foreground font-sans leading-relaxed mb-4">
            The Lodge's earliest records were, over the years, mislaid — doubtless distributed to various lofts as minute books filled and secretaries changed. What survives from 1988, however, offers a vivid window into Lodge life nearly four decades ago.
          </p>
          <p className="text-muted-foreground font-sans leading-relaxed mb-4">
            The Installation Meeting of 19th October 1988 took place at the former Guildford Masonic Centre — now the apartments on Hitherbury Close. Installing Master was W. Bro. Ken Stennett, known to many current members as the Lodge's long-serving Chaplain until his passing during the COVID pandemic. The incoming Master was W. Bro. George Kenyon, initiated into Weybridge Lodge on 23rd March 1955 and a Past Master on several previous occasions. Seventeen members and fifteen visitors attended.
          </p>
          <p className="text-muted-foreground font-sans leading-relaxed mb-4">From the minutes of that evening:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground font-sans leading-relaxed mb-6">
            <li>Lodge Treasurer W. Bro. Charlie Brown presented the annual accounts and proposed that annual subscriptions be increased — to £28.00.</li>
            <li>Grants of £50 were made to Princess Alice Hospice and The Sam Beare Unit at Weybridge Hospital (now part of Weybridge Hospice) — a reminder that the Lodge's commitment to charity is nothing new.</li>
            <li>A grant was made in memory of Mrs E. Edmonds, widow of W. Bro. Roy Edmonds MBE — Founder of the Lodge — and mother of Freddie Edmonds, the Lodge's first Initiate.</li>
            <li>The accounts were signed off by auditors W. Bro. Eddie Eke and Bro. Roger Curtis, recording a deficit for the year of £4.68.</li>
          </ul>
          <p className="text-muted-foreground font-sans leading-relaxed mb-6">
            The meeting was followed by what the minutes describe simply as "a most enjoyable Festive Board."
          </p>
          <p className="text-sm text-muted-foreground font-sans italic">— W. Bro. Tony Mallard MBE, PPAGDC</p>
        </Section>

        {/* SECTION 6 — TODAY */}
        <Section className="bg-navy-gradient">
          <h2 className="text-2xl md:text-3xl font-serif text-primary-foreground mb-6">Weybridge Lodge Today</h2>
          <p className="text-primary-foreground/70 font-sans leading-relaxed mb-4">
            From its roots in the aircraft factories of wartime Brooklands, through the market traders and professionals of post-war Weybridge, and across five different meeting venues, Weybridge Lodge has evolved into the Lodge it is today — meeting in Guildford and drawing its members from across Surrey and beyond.
          </p>
          <p className="text-primary-foreground/70 font-sans leading-relaxed mb-4">
            The Lodge today reflects the breadth of Surrey's professional and business community: entrepreneurs, lawyers, IT professionals, builders, and those from a wide range of commercial interests. What has never changed is the spirit that first called it into being — a commitment to Freemasonry, to fellowship, and to giving something back to the community we serve.
          </p>
          <p className="text-primary-foreground/70 font-sans leading-relaxed mb-4">
            In recent years the Lodge has taken an active role in the <Link to="/our-charities" className="text-gold hover:underline">Province of Surrey's 2030 Festival</Link>, raising funds for good causes across the county. That commitment to charity — the same impulse that sent £50 to a local hospice in 1988 — remains at the heart of everything we do.
          </p>
          <p className="text-primary-foreground/70 font-sans leading-relaxed">
            The Lodge meets regularly at the South West Surrey Masonic Centre, Guildford. <Link to="/join-us" className="text-gold hover:underline">New members are always welcome.</Link>
          </p>
        </Section>

        {/* CTA */}
        <section className="py-16 bg-warm-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/join-us"
                className="inline-flex items-center justify-center bg-gold text-navy px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:bg-gold-dark transition-colors"
              >
                Join Us
              </Link>
              <Link
                to="/lodge-profile"
                className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
              >
                Lodge Profile
              </Link>
              <Link
                to="/worshipful-masters"
                className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
              >
                Worshipful Masters
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default History;
