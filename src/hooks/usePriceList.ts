// Price List Hook

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { priceListService, PriceListProduct } from "@/services/priceListService";

export function usePriceList(filters?: {
  brand_id?: string;
  verified?: boolean;
  is_active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["price-list", filters],
    queryFn: () => priceListService.getProducts(filters),
  });
}

export function usePublicPriceList(filters?: {
  brand_id?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  sort_by?: 'price_asc' | 'price_desc' | 'name' | 'newest';
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["public-price-list", filters],
    queryFn: () => priceListService.getPublicPriceList(filters),
  });
}

export function usePriceListBrands() {
  return useQuery({
    queryKey: ["price-list-brands"],
    queryFn: () => priceListService.getBrands(),
  });
}

export function useUpdatePriceListProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PriceListProduct> }) =>
      priceListService.updateProduct(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-list"] });
    },
  });
}

export function useBulkUpdatePriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, updates }: { ids: string[]; updates: Partial<PriceListProduct> }) =>
      priceListService.bulkUpdate(ids, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-list"] });
    },
  });
}

export function useImportPriceListCSV() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (csvData: Array<Record<string, unknown>>) => priceListService.importCSV(csvData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-list"] });
    },
  });
}

export function usePriceListDuplicates() {
  return useQuery({
    queryKey: ["price-list-duplicates"],
    queryFn: () => priceListService.findDuplicates(),
  });
}

export function useMergePriceListDuplicates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ primaryId, duplicateIds }: { primaryId: string; duplicateIds: string[] }) =>
      priceListService.mergeDuplicates(primaryId, duplicateIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-list"] });
      queryClient.invalidateQueries({ queryKey: ["price-list-duplicates"] });
    },
  });
}