import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStaffAdmins } from "@/hooks/useStaffAdmins";
import { toast } from "sonner";

export default function StaffAdminManager() {
  const { data, loading, error, createStaffAdmin, deactivateStaffAdmin, refetch } = useStaffAdmins();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Full name and email are required.");
      return;
    }
    try {
      await createStaffAdmin({ full_name: fullName, email, status: "active" });
      setFullName("");
      setEmail("");
      toast.success("Staff admin created.");
      await refetch();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Failed to create staff admin.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staff Admin Management</h1>
        <p className="text-muted-foreground">Manage platform staff and their access levels.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Staff List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            <Input placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Button onClick={handleCreate}>Add Staff Admin</Button>
          </div>

          {loading ? <p className="text-sm text-muted-foreground">Loading staff admins...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {!loading && data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff admins yet. Create one to get started.</p>
          ) : null}

          <div className="space-y-2">
            {data.map((staff) => (
              <div key={staff.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium">{staff.full_name ?? "Unnamed Staff"}</p>
                  <p className="text-sm text-muted-foreground">{staff.email ?? "-"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={staff.status === "active" ? "default" : "secondary"}>{staff.status ?? "unknown"}</Badge>
                  {staff.status === "active" ? (
                    <Button variant="outline" size="sm" onClick={() => void deactivateStaffAdmin(staff.id)}>
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
