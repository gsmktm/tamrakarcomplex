import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function PayoutSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: payoutSettings, isLoading } = useQuery({
    queryKey: ["payout-settings", user?.id],
    queryFn: async () => {
      // Assuming a store_payouts table or settings in stores
      const { data, error } = await supabase
        .from("stores")
        .select("payout_method, payout_details")
        .eq("owner_id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updatePayoutMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("stores")
        .update(updates)
        .eq("owner_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout-settings"] });
      toast.success("Payout settings updated");
    },
    onError: (error) => {
      toast.error("Failed to update payout settings: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates = {
      payout_method: formData.get("method"),
      payout_details: {
        account_number: formData.get("account_number"),
        bank_name: formData.get("bank_name"),
        account_name: formData.get("account_name"),
      },
    };
    updatePayoutMutation.mutate(updates);
  };

  if (isLoading) {
    return <div>Loading payout settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payout Settings</h1>
        <p className="text-muted-foreground">Manage your payout method and details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="method">Payout Method</Label>
              <Select name="method" defaultValue={payoutSettings?.payout_method}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payout method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="mobile">Mobile Money</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input id="account_number" name="account_number" defaultValue={payoutSettings?.payout_details?.account_number} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input id="bank_name" name="bank_name" defaultValue={payoutSettings?.payout_details?.bank_name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_name">Account Name</Label>
                <Input id="account_name" name="account_name" defaultValue={payoutSettings?.payout_details?.account_name} />
              </div>
            </div>
            <Button type="submit" disabled={updatePayoutMutation.isPending}>
              {updatePayoutMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}