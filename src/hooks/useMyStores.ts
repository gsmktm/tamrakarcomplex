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

export function useMyStores() {
  const { user } = useAuth();

  return useQuery<MyStore[]>({
    queryKey: ["my-stores", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // store_admins table not yet in live schema — use owner-based lookup
      const { data: stores, error } = await supabase
        .from("stores")
        .select("id, name, package_slug, subscription_status, subscription_end_date")
        .eq("owner_id", user.id)
        .order("name");

      if (error) {
        console.error("Error fetching owned stores:", error);
        return [];
      }

      return (stores ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        package_slug: resolveEffectiveStorePackage(s),
        subscription_status: s.subscription_status,
      })) as MyStore[];
    },
    enabled: !!user?.id,
  });
}
