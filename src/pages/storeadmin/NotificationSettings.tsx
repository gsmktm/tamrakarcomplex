import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function NotificationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notificationSettings, isLoading } = useQuery({
    queryKey: ["notification-settings", user?.id],
    queryFn: async () => {
      // Assuming settings in stores table or separate
      const { data, error } = await supabase
        .from("stores")
        .select("notification_settings")
        .eq("owner_id", user?.id)
        .single();

      if (error) throw error;
      return data?.notification_settings || {
        order_alerts: true,
        repair_alerts: true,
        unlock_alerts: true,
      };
    },
    enabled: !!user?.id,
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("stores")
        .update({ notification_settings: updates })
        .eq("owner_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("Notification settings updated");
    },
    onError: (error) => {
      toast.error("Failed to update notifications: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates = {
      order_alerts: formData.get("order_alerts") === "on",
      repair_alerts: formData.get("repair_alerts") === "on",
      unlock_alerts: formData.get("unlock_alerts") === "on",
    };
    updateNotificationsMutation.mutate(updates);
  };

  if (isLoading) {
    return <div>Loading notification settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground">Configure alerts for your store activities</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="order_alerts">Order Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when new orders are placed</p>
              </div>
              <Switch
                id="order_alerts"
                name="order_alerts"
                defaultChecked={notificationSettings?.order_alerts}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="repair_alerts">Repair Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when repair requests are submitted</p>
              </div>
              <Switch
                id="repair_alerts"
                name="repair_alerts"
                defaultChecked={notificationSettings?.repair_alerts}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="unlock_alerts">Unlock Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when unlock requests are submitted</p>
              </div>
              <Switch
                id="unlock_alerts"
                name="unlock_alerts"
                defaultChecked={notificationSettings?.unlock_alerts}
              />
            </div>
            <Button type="submit" disabled={updateNotificationsMutation.isPending}>
              {updateNotificationsMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}