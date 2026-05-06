import { useCrudResource } from "@/hooks/useCrudResource";

export type MarketplaceListingRecord = {
  id: string;
  owner_user_id: string | null;
  store_id: string | null;
  listing_type: string | null;
  title: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  condition: string | null;
  price: number | null;
  description: string | null;
  images: string[] | null;
  location: string | null;
  status: string | null;
  verified: boolean | null;
  featured: boolean | null;
  created_at: string;
  updated_at: string;
};

export function useMarketplaceListings() {
  const resource = useCrudResource<MarketplaceListingRecord>({
    table: "marketplace_listings",
    queryKey: "marketplace-listings",
    orderBy: "created_at",
  });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    createListing: resource.create,
    updateListing: resource.update,
    deleteListing: resource.remove,
    approveListing: (id: string) => resource.update({ id, payload: { status: "approved" } }),
    rejectListing: (id: string) => resource.update({ id, payload: { status: "rejected" } }),
  };
}
