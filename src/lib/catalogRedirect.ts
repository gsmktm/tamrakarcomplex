/** Preserve old shopping links while using the canonical product catalog. */
export function getCatalogRedirectDestination(search: string, hash = ""): string {
  const params = new URLSearchParams(search);
  params.set("tab", "buy");
  return "/cat/mobiles?" + params.toString() + (hash.startsWith("#") ? hash : "");
}
