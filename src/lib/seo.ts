export const SITE_URL = "https://tamrakarcomplex.com";
export const DEFAULT_OG_IMAGE = "/og-image.png";

export type SeoRouteKey =
  | "/cat/mobiles"
  | "/cat/mobiles/:brand"
  | "/product/:slug"
  | "/stores"
  | "/stores/:slug"
  | "/marketplace"
  | "/marketplace/listing/:id"
  | "/sell-your-phone"
  | "/repair"
  | "/repair/device/:slug"
  | "/stores/article"
  | "/stores/article/:slug";

export type SeoPageConfig = {
  route_key: SeoRouteKey;
  label: string;
  title: string;
  description: string;
  keywords: string[];
  og_image: string;
};

export const SEO_PAGE_CONFIGS: SeoPageConfig[] = [
  {
    route_key: "/cat/mobiles",
    label: "Mobile Price List",
    title: "Mobile Price in Nepal 2026",
    description: "Compare the latest mobile phone prices in Nepal with verified specs, availability, EMI plans, and store offers at Tamrakar Complex.",
    keywords: ["mobile price Nepal", "smartphone price Nepal", "mobile price in Nepal 2026", "Tamrakar Complex mobile price"],
    og_image: DEFAULT_OG_IMAGE,
  },
  {
    route_key: "/cat/mobiles/:brand",
    label: "Brand Price Page",
    title: "{brand} Mobile Price in Nepal",
    description: "Check the latest {brand} mobile prices in Nepal with specs, variants, and buying options from Tamrakar Complex.",
    keywords: ["{brand} price Nepal", "{brand} mobile price", "buy {brand} Nepal"],
    og_image: DEFAULT_OG_IMAGE,
  },
  {
    route_key: "/product/:slug",
    label: "Product Detail",
    title: "{name} Price in Nepal",
    description: "Check {name} price in Nepal, specifications, availability, and genuine buying options at Tamrakar Complex.",
    keywords: ["{name} price Nepal", "buy {name} Nepal", "Tamrakar Complex"],
    og_image: DEFAULT_OG_IMAGE,
  },
  {
    route_key: "/stores",
    label: "Store Directory",
    title: "Tamrakar Complex Store Directory",
    description: "Browse verified mobile, repair, gadget, and electronics stores inside Tamrakar Complex, Kathmandu.",
    keywords: ["Tamrakar Complex stores", "mobile shops Kathmandu", "electronics stores Nepal"],
    og_image: DEFAULT_OG_IMAGE,
  },
  {
    route_key: "/stores/:slug",
    label: "Store Profile",
    title: "{name} Store at Tamrakar Complex",
    description: "View {name} contact details, services, opening hours, products, and offers at Tamrakar Complex.",
    keywords: ["{name}", "Tamrakar Complex store", "mobile shop Kathmandu"],
    og_image: DEFAULT_OG_IMAGE,
  },
  {
    route_key: "/marketplace",
    label: "Marketplace",
    title: "Buy and Sell Electronics in Nepal",
    description: "Browse active marketplace listings for mobiles, laptops, tablets, and gadgets from verified sellers in Nepal.",
    keywords: ["marketplace Nepal", "used phones Nepal", "buy sell electronics Nepal"],
    og_image: DEFAULT_OG_IMAGE,
  },
  {
    route_key: "/marketplace/listing/:id",
    label: "Marketplace Listing",
    title: "{title} for Sale in Nepal",
    description: "View price, condition, location, and contact details for {title} on Tamrakar Complex Marketplace.",
    keywords: ["{title}", "used gadget Nepal", "marketplace listing Nepal"],
    og_image: DEFAULT_OG_IMAGE,
  },
  {
    route_key: "/sell-your-phone",
    label: "Sell Your Phone",
    title: "Sell Your Phone in Nepal",
    description: "Get an instant used phone valuation and start a fast, quote-led phone resale flow with Tamrakar Complex.",
    keywords: ["sell phone Nepal", "phone valuation Nepal", "sell used mobile Nepal"],
    og_image: DEFAULT_OG_IMAGE,
  },
  {
    route_key: "/repair",
    label: "Repair Hub",
    title: "Mobile Repair in Nepal",
    description: "Book phone repair, track repair requests, and browse free device repair guides from Tamrakar Complex technicians.",
    keywords: ["mobile repair Nepal", "phone repair Kathmandu", "repair tracking"],
    og_image: DEFAULT_OG_IMAGE,
  },
  {
    route_key: "/repair/device/:slug",
    label: "Repair Device",
    title: "{name} Repair Guide and Service",
    description: "Find {name} repair guides, parts, tools, and professional repair service options at Tamrakar Complex.",
    keywords: ["{name} repair", "phone repair guide", "Tamrakar repair"],
    og_image: DEFAULT_OG_IMAGE,
  },
  {
    route_key: "/stores/article",
    label: "News",
    title: "Tech News Nepal",
    description: "Read the latest gadget launches, mobile price updates, tech news, reviews, and guides from Tamrakar Complex.",
    keywords: ["tech news Nepal", "gadget news Nepal", "mobile price news"],
    og_image: DEFAULT_OG_IMAGE,
  },
  {
    route_key: "/stores/article/:slug",
    label: "Article Detail",
    title: "{title}",
    description: "Read {title} from Tamrakar Complex with practical tech news, guides, reviews, and buying advice.",
    keywords: ["tech article Nepal", "gadget guide", "Tamrakar Complex news"],
    og_image: DEFAULT_OG_IMAGE,
  },
];

export function absoluteUrl(path = "/") {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function interpolateSeoTemplate(template: string, values: Record<string, string | number | null | undefined>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value === null || value === undefined || value === "" ? "" : String(value);
  }).replace(/\s+/g, " ").trim();
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function faqSchema(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
