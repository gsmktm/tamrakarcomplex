import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStoreAdmins } from "@/hooks/useStoreAdmins";
import { toast } from "sonner";

export default function StoreAdminManager() {
  const { data, loading, error, createStoreAdmin, deactivateStoreAdmin, refetch } = useStoreAdmins();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [storeId, setStoreId] = useState("");

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim() || !storeId.trim()) {
      toast.error("Full name, email, and store id are required.");
      return;
    }
    try {
      await createStoreAdmin({ full_name: fullName, email, store_id: storeId, status: "active" });
      setFullName("");
      setEmail("");
      setStoreId("");
      toast.success("Store admin created.");
      await refetch();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Failed to create store admin.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Admin Management</h1>
        <p className="text-muted-foreground">Manage store owners and their administrative access.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Merchant List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            <Input placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input placeholder="Store ID" value={storeId} onChange={(event) => setStoreId(event.target.value)} />
            <Button onClick={handleCreate}>Add Store Admin</Button>
          </div>

          {loading ? <p className="text-sm text-muted-foreground">Loading store admins...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {!loading && data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No store admins yet. Create one to get started.</p>
          ) : null}

          <div className="space-y-2">
            {data.map((staff) => (
              <div key={staff.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium">{staff.full_name ?? "Unnamed Store Admin"}</p>
                  <p className="text-sm text-muted-foreground">{staff.email ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">Store: {staff.store_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={staff.status === "active" ? "default" : "secondary"}>{staff.status ?? "unknown"}</Badge>
                  {staff.status === "active" ? (
                    <Button variant="outline" size="sm" onClick={() => void deactivateStoreAdmin(staff.id)}>
                      Deactivate
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
