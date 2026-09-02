import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_OG_IMAGE, SITE_URL } from "@/lib/seo";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  keywords?: string[];
  noindex?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function SEO({
  title = "Tamrakar Complex - Best Tech Deals in Nepal",
  description = "Find the best prices for mobile phones, laptops, and gadgets in Nepal. Tamrakar Complex offers the latest tech with genuine warranty.",
  image = DEFAULT_OG_IMAGE,
  url,
  type = "website",
  keywords,
  noindex = false,
  structuredData,
}: SEOProps) {
  const location = useLocation();
  const path = url || location.pathname;
  const { data: override } = useQuery({
    queryKey: ["seo-page-override", path],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_pages")
        .select("title, description, keywords, og_image, noindex")
        .eq("path", path)
        .eq("is_active", true)
        .maybeSingle();

      if (error) return null;
      return data as {
        title?: string | null;
        description?: string | null;
        keywords?: string[] | string | null;
        og_image?: string | null;
        noindex?: boolean | null;
      } | null;
    },
    initialData: null,
    retry: false,
    staleTime: 1000 * 60 * 10,
  });

  const effectiveTitle = override?.title || title;
  const effectiveDescription = override?.description || description;
  const effectiveKeywords = Array.isArray(override?.keywords)
    ? override?.keywords
    : typeof override?.keywords === "string"
      ? override.keywords.split(",").map((item) => item.trim()).filter(Boolean)
      : keywords;
  const effectiveImage = override?.og_image || image;
  const effectiveNoindex = override?.noindex ?? noindex;
  const siteUrl = SITE_URL;
  const fullUrl = path ? `${siteUrl}${path}` : siteUrl;
  const fullTitle = effectiveTitle.includes("Tamrakar") ? effectiveTitle : `${effectiveTitle} | Tamrakar Complex`;
  const robots = effectiveNoindex ? "noindex, nofollow" : "index, follow";
  const imageUrl = effectiveImage.startsWith("http") ? effectiveImage : `${siteUrl}${effectiveImage}`;
  const schemas = Array.isArray(structuredData) ? structuredData : structuredData ? [structuredData] : [];

  // Default Organization Schema for AI SEO
  const defaultOrgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Tamrakar Complex",
    "url": siteUrl,
    "logo": `${siteUrl}/logo.png`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Pako, New Road",
      "addressLocality": "Kathmandu",
      "addressCountry": "NP"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+977-015351731",
      "contactType": "customer service",
      "areaServed": "NP",
      "availableLanguage": ["Nepali", "English"]
    }
  };

  // Default WebSite Schema for Search & AI
  const defaultWebSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Tamrakar Complex",
    "url": siteUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${siteUrl}/cat/mobiles?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  const finalSchemas = [defaultOrgSchema, defaultWebSiteSchema, ...schemas];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={effectiveDescription} />
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      <meta property="og:site_name" content="Tamrakar Complex" />
      <link rel="canonical" href={fullUrl} />
      {effectiveKeywords?.length ? <meta name="keywords" content={effectiveKeywords.join(", ")} /> : null}

      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={effectiveDescription} />
      <meta property="og:image" content={imageUrl} />

      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={effectiveDescription} />
      <meta property="twitter:image" content={imageUrl} />

      {finalSchemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
