import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  type?: string;
  schema?: object | object[];
}

const SITE_NAME = "Weybridge Lodge No. 6787";
const BASE_URL = "https://www.weybridgelodge.org.uk";

const SEO = ({ title, description, canonical, type = "website", schema }: SEOProps) => {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const url = canonical ? `${BASE_URL}${canonical}` : undefined;

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

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />

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
  url: "https://www.weybridgelodge.org.uk",
  logo: "https://www.weybridgelodge.org.uk/weybridge-logo.svg",
  description:
    "An open, friendly and sociable Freemasons Lodge within the Province of Surrey, based at the South West Surrey Masonic Centre in Guildford.",
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

export const breadcrumbSchema = (
  items: { name: string; url: string }[]
) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    item: `https://www.weybridgelodge.org.uk${item.url}`,
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
  url: `https://www.weybridgelodge.org.uk${url}`,
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
  description,
  location: {
    "@type": "Place",
    name: "South West Surrey Masonic Centre",
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
  },
});
