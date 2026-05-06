import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function StoreSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: store, isLoading } = useQuery({
    queryKey: ["store-settings", user?.id],
    queryFn: async () => {
      // Assuming stores table has settings JSON or separate columns
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updateStoreMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("stores")
        .update(updates)
        .eq("owner_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast.success("Store settings updated");
    },
    onError: (error) => {
      toast.error("Failed to update settings: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates = {
      name: formData.get("name"),
      address: formData.get("address"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      business_hours: formData.get("business_hours"),
      policies: formData.get("policies"),
    };
    updateStoreMutation.mutate(updates);
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Store Settings</h1>
        <p className="text-muted-foreground">Manage your store's basic information and policies</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Store Name</Label>
                <Input id="name" name="name" defaultValue={store?.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={store?.phone} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={store?.email} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" defaultValue={store?.address} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_hours">Business Hours</Label>
              <Textarea id="business_hours" name="business_hours" defaultValue={store?.business_hours} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policies">Store Policies</Label>
              <Textarea id="policies" name="policies" defaultValue={store?.policies} />
            </div>
            <Button type="submit" disabled={updateStoreMutation.isPending}>
              {updateStoreMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}