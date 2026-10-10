/**
 * Routes only to searchable destinations that currently consume the q parameter.
 * Do not send search text to repair/stores; those pages have their own discovery UI.
 */
export type DiscoveryScope = "products" | "preowned";

export function getDiscoveryTarget(scope: DiscoveryScope, rawQuery: string): string {
  const query = rawQuery.trim().replace(/\s+/g, " ");
  const params = new URLSearchParams();
  if (scope === "products") params.set("tab", "buy");
  if (query) params.set("q", query);

  const pathname = scope === "products" ? "/cat/mobiles" : "/marketplace";
  const search = params.toString();
  return search ? pathname + "?" + search : pathname;
}
