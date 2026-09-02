import { useQuery } from "@tanstack/react-query";
import {
  LATEST_MOBILE_BUYING_PRICES,
  type LatestMobileBuyingPrice,
} from "@/data/latestMobileBuyingPrices";

export type { LatestMobileBuyingPrice };

/**
 * Bridge hook that exposes the static latest-mobile-buying-prices data
 * through TanStack React Query so the homepage PriceDesk section and
 * ProductCard can consume it with the same pattern used elsewhere.
 *
 * No network request — the data lives in the bundled JS.
 * `staleTime: Infinity` keeps the query from refetching on focus / remount.
 */
export function useLatestPrices() {
  return useQuery<LatestMobileBuyingPrice[]>({
    queryKey: ["latest-mobile-prices"],
    queryFn: () => LATEST_MOBILE_BUYING_PRICES,
    staleTime: Infinity,
  });
}
