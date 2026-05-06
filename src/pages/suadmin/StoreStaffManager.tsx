import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStoreStaff } from "@/hooks/useStoreStaff";
import { toast } from "sonner";

export default function StoreStaffManager() {
  const { data, loading, error, createStoreStaff, updateStoreStaff, refetch } = useStoreStaff();
  const [storeId, setStoreId] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");

  const handleCreate = async () => {
    if (!storeId.trim() || !fullName.trim()) {
      toast.error("Store ID and full name are required.");
      return;
    }
    try {
      await createStoreStaff({
        store_id: storeId,
        full_name: fullName,
        position,
        status: "active",
      });
      setFullName("");
      setPosition("");
      toast.success("Store staff created.");
      await refetch();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Failed to create store staff.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Staff Management</h1>
        <p className="text-muted-foreground">Monitor and manage staff across all merchant stores.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Global Store Staff List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Store ID" value={storeId} onChange={(event) => setStoreId(event.target.value)} />
            <Input placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            <Input placeholder="Position" value={position} onChange={(event) => setPosition(event.target.value)} />
            <Button onClick={handleCreate}>Add Staff</Button>
          </div>

          {loading ? <p className="text-sm text-muted-foreground">Loading store staff...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {!loading && data.length === 0 ? <p className="text-sm text-muted-foreground">No store staff records yet.</p> : null}

          <div className="space-y-2">
            {data.map((staff) => (
              <div key={staff.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium">{staff.full_name ?? "Unnamed Staff"}</p>
                  <p className="text-xs text-muted-foreground">
                    Store: {staff.store_id} | Position: {staff.position ?? "-"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={staff.status === "active" ? "default" : "secondary"}>{staff.status ?? "unknown"}</Badge>
                  {staff.status === "active" ? (
                    <Button variant="outline" size="sm" onClick={() => void updateStoreStaff({ id: staff.id, payload: { status: "inactive" } })}>
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
