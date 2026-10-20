/**
 * Preserve user-entered search and filters while normalizing the buy entry route.
 * URLSearchParams safely escapes characters instead of constructing a raw URL.
 */
export function buildBuyCatalogDestination(search = "", hash = ""): string {
  const params = new URLSearchParams(search);
  params.set("tab", "buy");
  const fragment = hash && hash.startsWith("#") ? hash : "";
  return "/cat/mobiles?" + params.toString() + fragment;
}
