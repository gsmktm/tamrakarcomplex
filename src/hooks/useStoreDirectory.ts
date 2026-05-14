// Store Directory Hook

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storeDirectoryService, type StoreDirectoryFilters, type StoreDirectoryItem } from "@/services/storeDirectoryService";

export function useStoreDirectory(filters?: StoreDirectoryFilters) {
  return useQuery({
    queryKey: ["store-directory", filters],
    queryFn: () => storeDirectoryService.getStoresForDirectory(filters),
  });
}

export function useStoreDetail(identifier: { type: 'id' | 'slug' | 'shop_no'; value: string; complex_zone?: string }) {
  return useQuery({
    queryKey: ["store-detail", identifier],
    queryFn: () => storeDirectoryService.getStoreByIdentifier(identifier),
    enabled: !!identifier.value,
  });
}

export function useStoreProducts(storeId: string) {
  return useQuery({
    queryKey: ["store-products", storeId],
    queryFn: () => storeDirectoryService.getStoreProducts(storeId),
    enabled: !!storeId,
  });
}

export function useStoreListings(storeId: string) {
  return useQuery({
    queryKey: ["store-listings", storeId],
    queryFn: () => storeDirectoryService.getStoreListings(storeId),
    enabled: !!storeId,
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, updates }: { storeId: string; updates: Partial<StoreDirectoryItem> }) =>
      storeDirectoryService.updateStore(storeId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-directory"] });
      queryClient.invalidateQueries({ queryKey: ["store-detail"] });
    },
  });
}
