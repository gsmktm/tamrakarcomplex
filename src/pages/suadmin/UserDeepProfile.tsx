import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { USER_ACTIVITY_HISTORY_COLUMNS } from "@/lib/supabaseColumnMaps";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Users,
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  ArrowLeft, 
  Loader2,
  Package,
  Wrench,
  Unlock,
  RefreshCw,
  Gift,
  History,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { getRoleLabel, getRoleBadgeVariant } from "@/lib/roles";
import type { ReferralHistoryItem, UserReferralData } from "@/types/admin";

export default function UserDeepProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["user-deep-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          user_roles (role)
        `)
        .eq("user_id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: referralData, isLoading: isReferralLoading } = useQuery({
    queryKey: ["user-referral-data", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_referral_data", { p_user_id: id });
      if (error) throw error;
      return data as UserReferralData;
    },
    enabled: !!id,
  });

  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["user-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_activity_history")
        .select(USER_ACTIVITY_HISTORY_COLUMNS.join(","))
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isProfileLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">User not found</h2>
        <Button onClick={() => navigate("/suadmin/users")} variant="link">Back to User Manager</Button>
      </div>
    );
  }

  const role = profile.user_roles?.[0]?.role || "user";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{profile.display_name || "User Profile"}</h1>
          <p className="text-muted-foreground">Detailed inspection and activity timeline.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-xl">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-primary" />
                )}
              </div>
              <div>
                <CardTitle className="text-2xl">{profile.display_name}</CardTitle>
                <Badge variant={getRoleBadgeVariant(role)} className="mt-2">
                  {getRoleLabel(role)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 border-t pt-6">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{profile.email || "No email"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{profile.phone || "No phone"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Joined {format(new Date(profile.created_at), "MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">{profile.user_id}</span>
            </div>
          </CardContent>
        </Card>

        {/* Stats and History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reward Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <Gift className="h-5 w-5 text-orange-500" />
                  {referralData?.total_earnings || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Referrals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  {referralData?.referred_count || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Activity Count</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <History className="h-5 w-5 text-green-500" />
                  {history?.length || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
              <TabsTrigger value="referrals">Referral History</TabsTrigger>
              <TabsTrigger value="notes">Admin Notes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {history?.map((item, idx) => (
                      <div key={idx} className="flex gap-4 relative">
                        {idx !== history.length - 1 && (
                          <div className="absolute left-[19px] top-8 bottom-[-24px] w-0.5 bg-muted" />
                        )}
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 z-10">
                          {item.activity_type === 'order' && <Package className="h-5 w-5 text-blue-500" />}
                          {item.activity_type === 'repair' && <Wrench className="h-5 w-5 text-orange-500" />}
                          {item.activity_type === 'unlock' && <Unlock className="h-5 w-5 text-green-500" />}
                          {item.activity_type === 'exchange' && <RefreshCw className="h-5 w-5 text-purple-500" />}
                        </div>
                        <div className="flex-1 pb-4 border-b border-muted last:border-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold capitalize">{item.activity_type} {item.status}</p>
                            <span className="text-xs text-muted-foreground">{format(new Date(item.created_at), "MMM d, HH:mm")}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        </div>
                      </div>
                    ))}
                    {history?.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No activity recorded yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="referrals" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Referred Users</CardTitle>
                  <CardDescription>Users who joined using this account's referral code: <strong>{referralData?.referral_code}</strong></CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {referralData?.history?.map((ref: ReferralHistoryItem, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{ref.display_name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{format(new Date(ref.created_at), "MMM d, yyyy")}</span>
                      </div>
                    ))}
                    {referralData?.history?.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No referrals yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Internal Admin Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <AlertTriangle className="h-4 w-4" />
                    Internal notes are only visible to Staff and Super Admins.
                  </div>
                  <textarea 
                    className="w-full h-32 p-3 rounded-md border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Add private note about this user..."
                  />
                  <Button className="w-full">Save Note</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
