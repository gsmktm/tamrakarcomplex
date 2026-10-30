/**
 * Marketplace availability must be backed by real database records.
 * Reference catalog entries are not merchant-authorized sale offers.
 */
export function assertMarketplaceSourcesAvailable(
  storeProductsError: unknown,
  userListingsError: unknown,
): void {
  if (storeProductsError && userListingsError) {
    throw new Error("Marketplace listings are temporarily unavailable. Please try again.");
  }
}

/** An authoritative empty result must stay empty, never become a mock sale. */
export function emptyMarketplaceResult<T>(): { listings: T[]; total: number } {
  return { listings: [], total: 0 };
}
