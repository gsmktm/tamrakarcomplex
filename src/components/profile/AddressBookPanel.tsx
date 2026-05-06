import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Plus, Edit, Trash2, Home, Building, Truck } from "lucide-react";
import { toast } from "sonner";

type Address = {
  id: string;
  type: "home" | "work" | "other";
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
};

export function AddressBookPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ["my-addresses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user!.id)
        .order("is_default", { ascending: false });

      if (error) throw error;
      return data as Address[];
    },
    enabled: !!user?.id,
  });

  const saveAddressMutation = useMutation({
    mutationFn: async (addressData: Omit<Address, "id">) => {
      if (editingAddress) {
        const { error } = await supabase
          .from("user_addresses")
          .update(addressData)
          .eq("id", editingAddress.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_addresses")
          .insert({ ...addressData, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-addresses"] });
      setIsDialogOpen(false);
      setEditingAddress(null);
      toast.success(editingAddress ? "Address updated" : "Address added");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to save address";
      toast.error(`Failed to save address: ${message}`);
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      const { error } = await supabase
        .from("user_addresses")
        .delete()
        .eq("id", addressId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-addresses"] });
      toast.success("Address deleted");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to delete address";
      toast.error(`Failed to delete address: ${message}`);
    },
  });

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingAddress(null);
    setIsDialogOpen(true);
  };

  const getAddressIcon = (type: string) => {
    switch (type) {
      case "home": return <Home className="h-4 w-4" />;
      case "work": return <Building className="h-4 w-4" />;
      case "other": return <MapPin className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return <div>Loading addresses...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Address Book</h2>
          <p className="text-muted-foreground">Manage your delivery and billing addresses</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Address
        </Button>
      </div>

      {addresses?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold mb-2">No addresses saved</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Add your delivery addresses to speed up checkout
            </p>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Address
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses?.map((address) => (
            <Card key={safeId(address.id)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getAddressIcon(address.type)}
                    <CardTitle className="text-lg capitalize">{address.type}</CardTitle>
                    {address.is_default && <Badge variant="default">Default</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(address)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAddressMutation.mutate(address.id)}
                      disabled={deleteAddressMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="font-medium">{safeText(address.name)}</div>
                  <div>{safeText(address.phone)}</div>
                  <div className="text-muted-foreground">
                    {safeText(address.address)}<br />
                    {safeText(address.city)}, {safeText(address.state)} {safeText(address.postal_code)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Address Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingAddress ? "Edit Address" : "Add New Address"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const addressData = {
                type: formData.get("type") as "home" | "work" | "other",
                name: formData.get("name") as string,
                phone: formData.get("phone") as string,
                address: formData.get("address") as string,
                city: formData.get("city") as string,
                state: formData.get("state") as string,
                postal_code: formData.get("postal_code") as string,
                is_default: formData.get("is_default") === "on",
              };
              saveAddressMutation.mutate(addressData);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Address Type</Label>
                <Select name="type" defaultValue={editingAddress?.type || "home"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Contact Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingAddress?.name}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={editingAddress?.phone}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Street Address</Label>
              <Textarea
                id="address"
                name="address"
                defaultValue={editingAddress?.address}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={editingAddress?.city}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  name="state"
                  defaultValue={editingAddress?.state}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  name="postal_code"
                  defaultValue={editingAddress?.postal_code}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_default"
                  name="is_default"
                  defaultChecked={editingAddress?.is_default}
                  className="rounded"
                />
                <Label htmlFor="is_default">Set as default address</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveAddressMutation.isPending}>
                {saveAddressMutation.isPending ? "Saving..." : editingAddress ? "Update" : "Add"} Address
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}