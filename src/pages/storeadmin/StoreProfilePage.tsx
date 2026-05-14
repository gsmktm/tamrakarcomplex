import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Store as StoreIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import StoreManage from "@/pages/StoreManage";

export default function StoreProfilePage() {
  const { user, role } = useAuth();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStore() {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        // Try to find a store where the user is an owner or admin
        const { data: adminData, error: adminError } = await supabase
          .from("store_admins")
          .select("store_id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (adminData?.store_id) {
          setStoreId(adminData.store_id);
          return;
        }

        const { data: ownedData, error: ownedError } = await supabase
          .from("stores")
          .select("id")
          .or(`owner_id.eq.${user.id},owner_user_id.eq.${user.id}`)
          .limit(1)
          .maybeSingle();

        if (ownedData?.id) {
          setStoreId(ownedData.id);
          return;
        }

        setError("No store found associated with your account.");
      } catch (err) {
        console.error("Error fetching store for profile:", err);
        setError("Failed to load store information.");
      } finally {
        setLoading(false);
      }
    }

    fetchStore();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !storeId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive opacity-50" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Store Not Found</h3>
          <p className="text-muted-foreground">{error || "You don't seem to have a store yet."}</p>
        </div>
        <Button asChild>
          <Link to="/storeadmin">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  // We reuse StoreManage but we need to make sure it doesn't render Header/Footer when in this context
  return <StoreManage storeId={storeId} />;
}
