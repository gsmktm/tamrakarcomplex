// Store Directory Hook

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storeDirectoryService, type StoreDirectoryFilters, type StoreDirectoryItem } from "@/services/storeDirectoryService";
import { getStoreDetailQueryKey, type StoreDetailIdentifier } from "./storeDetailQueryKey";

// Cache TTLs (ms)
const STORE_LIST_STALE   = 5  * 60 * 1000; // 5 min  — list changes infrequently
const STORE_DETAIL_STALE = 10 * 60 * 1000; // 10 min — detail even less so
const STORE_PRODUCTS_STALE = 3 * 60 * 1000; // 3 min  — products/listings change more

export function useStoreDirectory(filters?: StoreDirectoryFilters) {
  return useQuery({
    queryKey: ["store-directory", filters ?? null],
    queryFn: () => storeDirectoryService.getStoresForDirectory(filters),
    staleTime: STORE_LIST_STALE,
    placeholderData: (prev) => prev, // keep showing old list while refetching
  });
}

export function useStoreDetail(identifier: StoreDetailIdentifier) {
  return useQuery({
    queryKey: getStoreDetailQueryKey(identifier),
    queryFn: () => storeDirectoryService.getStoreByIdentifier(identifier),
    enabled: !!identifier.value,
    staleTime: STORE_DETAIL_STALE,
  });
}

export function useStoreProducts(storeId: string) {
  return useQuery({
    queryKey: ["store-products", storeId],
    queryFn: () => storeDirectoryService.getStoreProducts(storeId),
    enabled: !!storeId,
    staleTime: STORE_PRODUCTS_STALE,
    placeholderData: (prev) => prev,
  });
}

export function useStoreListings(storeId: string) {
  return useQuery({
    queryKey: ["store-listings", storeId],
    queryFn: () => storeDirectoryService.getStoreListings(storeId),
    enabled: !!storeId,
    staleTime: STORE_PRODUCTS_STALE,
    placeholderData: (prev) => prev,
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, updates }: { storeId: string; updates: Partial<StoreDirectoryItem> }) =>
      storeDirectoryService.updateStore(storeId, updates),
    onSuccess: (_, { storeId }) => {
      // Invalidate list + the specific detail entry
      queryClient.invalidateQueries({ queryKey: ["store-directory"] });
      queryClient.invalidateQueries({ queryKey: ["store-detail"] });
      queryClient.invalidateQueries({ queryKey: ["store-products", storeId] });
      queryClient.invalidateQueries({ queryKey: ["store-listings", storeId] });
    },
  });
}
