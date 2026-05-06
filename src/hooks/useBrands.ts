import { useCrudResource } from "@/hooks/useCrudResource";

export type BrandRecord = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
};

export function useBrands() {
  const resource = useCrudResource<BrandRecord>({
    table: "brands",
    queryKey: "brands",
    orderBy: "created_at",
  });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    createBrand: resource.create,
    updateBrand: resource.update,
    deleteBrand: resource.remove,
  };
}
