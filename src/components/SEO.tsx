import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  type?: string;
  image?: string;
  schema?: object | object[];
}

const SITE_NAME = "Weybridge Lodge No. 6787";
const BASE_URL = "https://weybridgelodge.org.uk";

const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

const SEO = ({ title, description, canonical, type = "website", image, schema }: SEOProps) => {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const url = canonical ? `${BASE_URL}${canonical}` : undefined;
  const ogImage = image || DEFAULT_OG_IMAGE;

  const schemas = schema
    ? Array.isArray(schema)
      ? schema
      : [schema]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {url && <link rel="canonical" href={url} />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;

// ── Schema Helpers ──

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "FraternalOrganization",
  name: "Weybridge Lodge No. 6787",
  alternateName: "Weybridge Masonic Lodge",
  // url intentionally omitted — declared once in index.html JSON-LD @graph to avoid duplicate url properties in the merged Organization entity.

  logo: "https://weybridgelodge.org.uk/weybridge-logo.svg",
  description:
    "An open, friendly and sociable Freemasons Lodge within the Province of Surrey, based at the Guildford Masonic Centre in Guildford.",
  foundingDate: "1949-01-29",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Hitherbury Close",
    addressLocality: "Guildford",
    addressRegion: "Surrey",
    postalCode: "GU2 4DR",
    addressCountry: "GB",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 51.2362,
    longitude: -0.5745,
  },
  telephone: "+447921589039",
  email: "secretary@weybridgelodge.org.uk",
  sameAs: [
    "https://instagram.com/weybridgelodge/",
    "https://facebook.com/people/Weybridge-Lodge-No-6787/61551808420513/",
    "https://twitter.com/weybridgelodge",
  ],
  memberOf: [
    {
      "@type": "Organization",
      name: "United Grand Lodge of England",
      url: "https://www.ugle.org.uk/",
    },
    {
      "@type": "Organization",
      name: "Provincial Grand Lodge of Surrey",
      url: "https://surreyfreemasons.org.uk/",
    },
  ],
};

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["FraternalOrganization", "LocalBusiness"],
  name: "Weybridge Lodge No. 6787",
  legalName: "Weybridge Lodge No. 6787, United Grand Lodge of England",
  alternateName: "Weybridge Masonic Lodge",
  description:
    "Weybridge Lodge No. 6787 is a Freemasons Lodge within the Province of Surrey, meeting at the Guildford Masonic Centre, Guildford. Despite its historic name reflecting its 1949 founding in Weybridge, the Lodge has met in Guildford since 1986.",
  // url intentionally omitted — declared once in index.html JSON-LD @graph to avoid duplicate url properties in the merged LocalBusiness entity.
  logo: "https://weybridgelodge.org.uk/weybridge-logo.svg",
  image: "https://weybridgelodge.org.uk/og-image.png",
  priceRange: "Membership by invitation — free to enquire",
  telephone: "+447921589039",
  email: "secretary@weybridgelodge.org.uk",
  address: {
    "@type": "PostalAddress",
    name: "Guildford Masonic Centre, Weybourne House",
    streetAddress: "Hitherbury Close, Portsmouth Road",
    addressLocality: "Guildford",
    addressRegion: "Surrey",
    postalCode: "GU2 4DR",
    addressCountry: "GB",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 51.2362,
    longitude: -0.5745,
  },
  hasMap: "https://www.google.com/maps?cid=16367882607439388236",
  areaServed: [
    { "@type": "City", "name": "Guildford" },
    { "@type": "City", "name": "Woking" },
    { "@type": "City", "name": "Godalming" },
    { "@type": "City", "name": "Farnham" },
    { "@type": "AdministrativeArea", "name": "Surrey" },
  ],
  foundingDate: "1949-01-29",
  foundingLocation: {
    "@type": "Place",
    name: "Weybridge, Surrey",
  },
  sameAs: [
    "https://instagram.com/weybridgelodge/",
    "https://facebook.com/people/Weybridge-Lodge-No-6787/61551808420513/",
    "https://twitter.com/weybridgelodge",
  ],
  memberOf: [
    {
      "@type": "Organization",
      name: "United Grand Lodge of England",
      url: "https://www.ugle.org.uk/",
    },
    {
      "@type": "Organization",
      name: "Provincial Grand Lodge of Surrey",
      url: "https://surreyfreemasons.org.uk/",
    },
  ],
};

export const breadcrumbSchema = (
  items: { name: string; url: string }[]
) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    item: `https://weybridgelodge.org.uk${item.url}`,
  })),
});

export const faqSchema = (
  faqs: { question: string; answer: string }[]
) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

export const articleSchema = ({
  title,
  date,
  description,
  url,
  image,
}: {
  title: string;
  date: string;
  description: string;
  url: string;
  image?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  datePublished: date,
  description,
  url: `https://weybridgelodge.org.uk${url}`,
  ...(image && { image }),
  author: {
    "@type": "Organization",
    name: "Weybridge Lodge No. 6787",
  },
  publisher: {
    "@type": "Organization",
    name: "Weybridge Lodge No. 6787",
  },
});

export const eventSchema = ({
  name,
  date,
  description,
}: {
  name: string;
  date: string;
  description: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Event",
  name,
  startDate: date,
  endDate: new Date(new Date(date).getTime() + 4 * 60 * 60 * 1000).toISOString(),
  description,
  image: DEFAULT_OG_IMAGE,
  eventStatus: "https://schema.org/EventScheduled",
  location: {
    "@type": "Place",
    name: "Guildford Masonic Centre",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Hitherbury Close",
      addressLocality: "Guildford",
      addressRegion: "Surrey",
      postalCode: "GU2 4DR",
      addressCountry: "GB",
    },
  },
  organizer: {
    "@type": "Organization",
    name: "Weybridge Lodge No. 6787",
    url: "https://weybridgelodge.org.uk",
  },
  performer: {
    "@type": "PerformingGroup",
    name: "Weybridge Lodge No. 6787",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "GBP",
    availability: "https://schema.org/InStock",
    url: "https://weybridgelodge.org.uk/bookings",
  },
});
