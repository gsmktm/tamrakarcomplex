/** Preserve URL state when old product and store routes are canonicalized. */
export function legacyDetailDestination(
  prefix: "/cat/mobiles" | "/mobile" | "/stores",
  slug: string | undefined,
  search = "",
  hash = "",
): string {
  const clean = slug?.trim();
  const destination = clean ? prefix + "/" + encodeURIComponent(clean) : prefix;
  const query = search.startsWith("?") ? search : "";
  const fragment = hash.startsWith("#") ? hash : "";
  return destination + query + fragment;
}
