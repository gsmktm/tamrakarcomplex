/**
 * Store detail cache identity must include every input that can affect the
 * storeDirectoryService.getStoreByIdentifier() result.
 *
 * The local fallback uses complex_zone to distinguish shops with the same
 * shop number. Omitting it lets a 10-minute React Query cache entry for one
 * zone appear on another zone's page.
 *
 * Preserve the existing three-part key for unscoped lookups so the store
 * directory's hover-prefetch remains reusable.
 */
export type StoreDetailIdentifier = {
  type: "id" | "slug" | "shop_no";
  value: string;
  complex_zone?: string;
};

export function getStoreDetailQueryKey(identifier: StoreDetailIdentifier) {
  const base = ["store-detail", identifier.type, identifier.value] as const;
  return identifier.complex_zone
    ? [...base, identifier.complex_zone] as const
    : base;
}
