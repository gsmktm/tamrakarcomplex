import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Edit,
  Key,
  Bell,
  MapPin,
  DollarSign,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { safeText, getSafeDisplayName, getSafeInitials } from "@/lib/utils";

export function ProfileOverview() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile-overview", user?.id],
    queryFn: async () => {
      const [profileRes, ordersRes, repairsRes, listingsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle(),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("repair_requests").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("sell_listings").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);

      if (profileRes.error) throw profileRes.error;

      return {
        profile: profileRes.data,
        stats: {
          total_orders: ordersRes.count ?? 0,
          total_repairs: repairsRes.count ?? 0,
          total_listings: listingsRes.count ?? 0,
          total_points: profileRes.data?.referral_points || 0,
          member_since: user?.created_at,
        },
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div>Loading profile...</div>;
  }

  const profileData = profile?.profile;
  const stats = profile?.stats;

  const displayName = getSafeDisplayName(user);
  const initials = getSafeInitials(displayName);

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
             <Avatar className="h-24 w-24">
               <AvatarImage src={safeText(profileData?.avatar_url) || undefined} />
               <AvatarFallback className="text-2xl">
                 {initials}
               </AvatarFallback>
             </Avatar>

            <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-2xl font-bold">
                {displayName}
              </h2>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {safeText(user?.email)}
                </div>
                {safeText(profileData?.phone) && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {safeText(profileData.phone)}
                  </div>
                )}
              </div>
            </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined {stats?.member_since ? format(new Date(stats.member_since), "MMM yyyy") : "Recently"}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Verified Account
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {stats?.total_points || 0} Points
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link to="/user/settings">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/user/settings">
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/user/settings">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats?.total_orders || 0}</div>
            <div className="text-sm text-muted-foreground">Orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats?.total_repairs || 0}</div>
            <div className="text-sm text-muted-foreground">Repairs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats?.total_listings || 0}</div>
            <div className="text-sm text-muted-foreground">Listings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats?.total_points || 0}</div>
            <div className="text-sm text-muted-foreground">Points</div>
          </CardContent>
        </Card>
      </div>

      {/* Account Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm">{safeText(user?.email)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Phone</span>
              <span className="text-sm">{safeText(profileData?.phone) || "Not set"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Member Since</span>
              <span className="text-sm">
                {stats?.member_since ? format(new Date(stats.member_since), "MMM d, yyyy") : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Last Login</span>
              <span className="text-sm">Today</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Email Notifications</span>
              <Badge variant="secondary">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">SMS Notifications</span>
              <Badge variant="secondary">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Marketing Emails</span>
              <Badge variant="outline">Disabled</Badge>
            </div>
            <Separator />
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <MapPin className="h-4 w-4 mr-2" />
                Manage Addresses
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Key className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
