import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStorePermissions } from "@/hooks/useStorePermissions";
import { toast } from "sonner";

export default function StoreAdminPermissionManager() {
  const { data, loading, error, createStorePermission, refetch } = useStorePermissions();
  const [storeId, setStoreId] = useState("");
  const [adminId, setAdminId] = useState("");
  const [moduleKey, setModuleKey] = useState("store_profile");

  const handleGrant = async () => {
    if (!storeId.trim() || !adminId.trim() || !moduleKey.trim()) {
      toast.error("Store, admin, and module are required.");
      return;
    }
    try {
      await createStorePermission({
        store_id: storeId,
        store_admin_user_id: adminId,
        module_key: moduleKey,
        can_view: true,
      });
      toast.success("Permission granted.");
      await refetch();
    } catch (grantError) {
      const message = grantError instanceof Error ? grantError.message : "Failed to save permission.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Permissions</h1>
        <p className="text-muted-foreground">Manage administrative capabilities for store owners.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Store Access Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Store ID" value={storeId} onChange={(event) => setStoreId(event.target.value)} />
            <Input placeholder="Admin User ID" value={adminId} onChange={(event) => setAdminId(event.target.value)} />
            <Input placeholder="Module key" value={moduleKey} onChange={(event) => setModuleKey(event.target.value)} />
            <Button onClick={handleGrant}>Grant View Access</Button>
          </div>

          {loading ? <p className="text-sm text-muted-foreground">Loading permissions...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {!loading && data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No store permissions configured yet.</p>
          ) : null}

          <div className="space-y-2">
            {data.map((permission) => (
              <div key={permission.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium">{permission.module_key}</p>
                  <p className="text-xs text-muted-foreground">
                    Store: {permission.store_id} | Admin: {permission.store_admin_user_id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={permission.can_view ? "default" : "secondary"}>view</Badge>
                  <Badge variant={permission.can_create ? "default" : "secondary"}>create</Badge>
                  <Badge variant={permission.can_edit ? "default" : "secondary"}>edit</Badge>
                  <Badge variant={permission.can_delete ? "default" : "secondary"}>delete</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
