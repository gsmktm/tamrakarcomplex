import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Store, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StoreStaffManager() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [storeId, setStoreId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: stores } = useQuery({
    queryKey: ["stores-list-for-staff"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").order("name");
      if (error) throw error;
      return data;
    }
  });

  const { data: staff, refetch } = useQuery({
    queryKey: ["store-staff-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, store_id, role")
        .not("store_id", "is", null);
      if (error) throw error;
      return data;
    }
  });

  const handleAddStaff = async () => {
    if (!fullName.trim() || !email.trim() || !storeId.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("grant_role_by_email", {
        p_email: email,
        p_role: "staff"
      });
      
      if (error) throw error;
      
      toast.success("Staff member invited and role assigned.");
      setFullName("");
      setEmail("");
      setStoreId("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to add staff");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Store Staff</h1>
          <p className="text-muted-foreground">Manage employees for all registered stores.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[400px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add Store Employee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input placeholder="Employee Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="staff@store.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned Store</label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {stores?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={handleAddStaff} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Invite Staff
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Platform Staff Directory
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!staff?.length ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No store staff found</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {staff.map((s) => {
                  const store = stores?.find(st => st.id === s.store_id);
                  return (
                    <div key={s.id} className="flex items-center justify-between rounded-xl border p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold">
                          {s.full_name?.[0] ?? "S"}
                        </div>
                        <div>
                          <p className="font-semibold">{s.full_name || "Unknown Staff"}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {s.email || "No email"}</span>
                            <span className="text-xs text-primary font-medium flex items-center gap-1"><Store className="h-3 w-3" /> {store?.name || "Global Staff"}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">{s.role || "staff"}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
