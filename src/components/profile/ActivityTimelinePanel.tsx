import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ShoppingCart,
  Wrench,
  CreditCard,
  User,
  Gift,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

export function ActivityTimelinePanel() {
  const { user } = useAuth();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["my-activity-timeline", user?.id],
    queryFn: async () => {
      // Combine activities from different tables
      const [ordersRes, repairsRes, listingsRes, referralsRes] = await Promise.allSettled([
        supabase.from("orders").select("id, created_at").eq("user_id", user!.id).limit(5),
        supabase.from("repair_requests").select("id, created_at, status").eq("user_id", user!.id).limit(5),
        supabase.from("sell_listings").select("id, created_at, title").eq("user_id", user!.id).limit(5),
        supabase.from("referral_invites").select("id, created_at, status").eq("inviter_id", user!.id).limit(5),
      ]);

      const activities = [];

      // Orders
      if (ordersRes.status === "fulfilled") {
        ordersRes.value.data?.forEach(order => {
          activities.push({
            id: `order-${order.id}`,
            type: "order",
            title: "Placed an order",
            description: `Order #${order.id.slice(-8)}`,
            timestamp: order.created_at,
            icon: ShoppingCart,
          });
        });
      }

      // Repairs
      if (repairsRes.status === "fulfilled") {
        repairsRes.value.data?.forEach(repair => {
          activities.push({
            id: `repair-${repair.id}`,
            type: "repair",
            title: "Submitted repair request",
            description: `Status: ${repair.status}`,
            timestamp: repair.created_at,
            icon: Wrench,
          });
        });
      }

      // Listings
      if (listingsRes.status === "fulfilled") {
        listingsRes.value.data?.forEach(listing => {
          activities.push({
            id: `listing-${listing.id}`,
            type: "listing",
            title: "Created marketplace listing",
            description: listing.title,
            timestamp: listing.created_at,
            icon: CreditCard,
          });
        });
      }

      // Referrals
      if (referralsRes.status === "fulfilled") {
        referralsRes.value.data?.forEach(referral => {
          activities.push({
            id: `referral-${referral.id}`,
            type: "referral",
            title: "Sent referral invitation",
            description: `Status: ${referral.status}`,
            timestamp: referral.created_at,
            icon: Gift,
          });
        });
      }

      // Sort by timestamp descending
      return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);
    },
    enabled: !!user?.id,
  });

  const getActivityIcon = (type: string) => {
    const icons = {
      order: ShoppingCart,
      repair: Wrench,
      listing: CreditCard,
      referral: Gift,
      profile: User,
      exchange: RefreshCw,
    };
    return icons[type as keyof typeof icons] || Activity;
  };

  const getActivityColor = (type: string) => {
    const colors = {
      order: "text-blue-500",
      repair: "text-orange-500",
      listing: "text-green-500",
      referral: "text-purple-500",
      profile: "text-gray-500",
      exchange: "text-cyan-500",
    };
    return colors[type as keyof typeof colors] || "text-gray-500";
  };

  if (isLoading) {
    return <div>Loading activity...</div>;
  }

  return (
    <div className="space-y-6">
      {activities?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold mb-2">No activity yet</h3>
            <p className="text-sm text-muted-foreground text-center">
              Your account activity will appear here as you use the platform
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities?.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                const colorClass = getActivityColor(activity.type);

                return (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className={`p-2 rounded-full bg-muted ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{activity.title}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {activity.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.timestamp), "PPP 'at' p")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}