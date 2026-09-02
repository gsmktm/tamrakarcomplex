import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { resolveEffectiveStorePackage } from "@/lib/storeEntitlements";

export interface MyStore {
  id: string;
  name: string;
  package_slug: string | null;
  subscription_status: string | null;
}

/**
 * Returns all stores the current user has access to:
 *   - Stores they own (owner_id OR owner_user_id)
 *   - Stores they are assigned to via store_admins table
 *
 * This is the single source of truth for "my stores" across all storeadmin pages.
 */
export function useMyStores() {
  const { user } = useAuth();

  return useQuery<MyStore[]>({
    queryKey: ["my-stores", user?.id],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) return [];

      // 1. Stores owned directly (owner_id OR owner_user_id)
      const { data: ownedStores } = await supabase
        .from("stores")
        .select("id, name, package_slug, subscription_status, subscription_end_date")
        .or(`owner_id.eq.${user.id},owner_user_id.eq.${user.id}`)
        .order("name");

      // 2. Stores assigned as an administrator or active store staff member.
      const [{ data: adminRows }, { data: staffRows }] = await Promise.all([
        supabase.from("store_admins").select("store_id").eq("user_id", user.id).eq("status", "active"),
        (supabase as any).from("store_staff").select("store_id").eq("user_id", user.id).eq("status", "active"),
      ]);

      let assignedStores: typeof ownedStores = [];

      const membershipRows = [...(adminRows ?? []), ...(staffRows ?? [])];
      if (membershipRows.length > 0) {
        const assignedIds = [...new Set(membershipRows.map((r: { store_id: string }) => r.store_id))];
        const { data: assigned } = await supabase
          .from("stores")
          .select("id, name, package_slug, subscription_status, subscription_end_date")
          .in("id", assignedIds)
          .order("name");
        assignedStores = assigned ?? [];
      }

      // Merge, deduplicate by id
      const owned = ownedStores ?? [];
      const combined = [...owned, ...assignedStores];
      const seen = new Set<string>();
      const unique = combined.filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });

      return unique.map((s) => ({
        id: s.id,
        name: s.name,
        package_slug: resolveEffectiveStorePackage(s),
        subscription_status: s.subscription_status,
      })) as MyStore[];
    },
    enabled: !!user?.id,
  });
}
