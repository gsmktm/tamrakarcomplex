import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoreMembershipResult {
  storeIds: string[];
  memberships: { store_id: string }[];
  ownedStoreIds: string[];
  allStoreIds: string[];
  isLoading: boolean;
  error: Error | null;
}

export function useStoreMembership(userId: string | undefined): StoreMembershipResult {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["store-membership", userId],
    queryFn: async (): Promise<{
      memberships: { store_id: string }[];
      ownedStoreIds: string[];
    }> => {
      if (!userId) return { memberships: [], ownedStoreIds: [] };

      const [membershipsRes, ownedStoresRes] = await Promise.all([
        supabase
          .from("store_admins")
          .select("store_id")
          .eq("user_id", userId)
          .eq("status", "active"),

        supabase
          .from("stores")
          .select("id")
          .or(`owner_id.eq.${userId},owner_user_id.eq.${userId}`),
      ]);

      const memberships = membershipsRes.data ?? [];
      const ownedStoreIds = (ownedStoresRes.data ?? []).map((s) => s.id);

      return { memberships, ownedStoreIds };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const memberships = data?.memberships ?? [];
  const ownedStoreIds = data?.ownedStoreIds ?? [];
  const allStoreIds = Array.from(
    new Set([...memberships.map((m) => m.store_id), ...ownedStoreIds])
  );

  return {
    storeIds: allStoreIds,
    memberships,
    ownedStoreIds,
    allStoreIds,
    isLoading,
    error: error as Error | null,
  };
}
