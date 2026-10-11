/**
 * A search result may use a canonical destination (for example /mobile/:slug)
 * which takes precedence over its visual result type.
 */
export type PublicSearchDestination = {
  type: "article" | "product" | "guide" | "store" | "service";
  slug: string;
  href?: string;
};

function safeSegment(slug: string): string {
  return encodeURIComponent(slug.trim());
}

export function getSearchResultDestination(result: PublicSearchDestination): string {
  // Protect against protocol/host redirects in paths supplied by external data.
  if (result.href?.startsWith("/") && !result.href.startsWith("//")) {
    return result.href;
  }

  const slug = safeSegment(result.slug);
  switch (result.type) {
    case "article": return "/stores/article/" + slug;
    case "product": return "/product/" + slug;
    case "guide": return "/guide/" + slug;
    case "store": return "/stores/" + slug;
    case "service": return "/services";
  }
}
