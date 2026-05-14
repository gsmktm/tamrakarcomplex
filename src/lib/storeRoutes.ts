import { slugify } from "@/lib/utils";

type StoreRouteLike = {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  seo_slug?: unknown;
};

function cleanStoreRoutePart(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function getPublicStoreSlug(store: StoreRouteLike) {
  return (
    cleanStoreRoutePart(store.seo_slug) ||
    cleanStoreRoutePart(store.slug) ||
    slugify(cleanStoreRoutePart(store.name)) ||
    cleanStoreRoutePart(store.id)
  );
}

export function getPublicStorePath(store: StoreRouteLike) {
  const slug = getPublicStoreSlug(store);
  return slug ? `/stores/${slug}` : "/stores";
}
