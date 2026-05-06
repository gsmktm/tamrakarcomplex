import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Gift,
  Copy,
  Share2,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { safeText } from "@/lib/utils";

export function ReferralRewardsPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: referralData, isLoading } = useQuery({
    queryKey: ["my-referrals", user?.id],
    queryFn: async () => {
      const [profileRes, referralsRes] = await Promise.all([
        supabase.from("profiles").select("referral_code, referral_points").eq("id", user!.id).single(),
        supabase.from("referral_invites").select("*").eq("inviter_id", user!.id).order("created_at", { ascending: false }),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (referralsRes.error) throw referralsRes.error;

      return {
        profile: profileRes.data,
        referrals: referralsRes.data || [],
      };
    },
    enabled: !!user?.id,
  });

  const copyReferralLink = () => {
    const code = safeText(referralData?.profile?.referral_code);
    if (!code) return;

    const url = `${window.location.origin}/auth?ref=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Referral link copied!");
  };

  const shareReferral = () => {
    const code = safeText(referralData?.profile?.referral_code);
    if (!code) return;

    const url = `${window.location.origin}/auth?ref=${code}`;
    if (navigator.share) {
      navigator.share({
        title: "Join Tamrakar Complex",
        text: "Sign up with my referral and get rewards!",
        url,
      });
    } else {
      copyReferralLink();
    }
  };

  if (isLoading) {
    return <div>Loading referrals...</div>;
  }

  const profile = referralData?.profile;
  const referrals = referralData?.referrals || [];

  const successfulReferrals = referrals.filter(r => r.status === "completed");
  const pendingReferrals = referrals.filter(r => r.status === "pending");

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Refer & Earn Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Your Referral Code</h3>
                <div className="flex gap-2">
                  <div className="flex-1 bg-muted p-3 rounded-lg font-mono text-sm">
                    {safeText(profile?.referral_code) || "Loading..."}
                  </div>
                  <Button variant="outline" size="icon" onClick={copyReferralLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Referral Link</h3>
                <div className="bg-muted p-3 rounded-lg text-sm break-all">
                  {safeText(profile?.referral_code) ? `${window.location.origin}/auth?ref=${safeText(profile.referral_code)}` : "Loading..."}
                </div>
                <Button className="w-full mt-2" onClick={shareReferral}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Referral Link
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{profile?.referral_points || 0}</div>
                <div className="text-sm text-muted-foreground">Total Points Earned</div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{referrals.length}</div>
                  <div className="text-xs text-muted-foreground">Invited</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{successfulReferrals.length}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{pendingReferrals.length}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Referral History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No referrals yet. Start sharing your link!
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <div key={safeId(referral.id)} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {referral.status === "completed" && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {referral.status === "pending" && <Clock className="h-5 w-5 text-blue-500" />}
                    {referral.status === "expired" && <XCircle className="h-5 w-5 text-red-500" />}
                    <div>
                      <div className="font-medium">{referral.invitee_email}</div>
                      <div className="text-sm text-muted-foreground">
                        Invited {format(new Date(referral.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        referral.status === "completed" ? "default" :
                        referral.status === "pending" ? "secondary" : "destructive"
                      }
                    >
                      {referral.status}
                    </Badge>
                    {referral.reward_points && (
                      <div className="text-sm text-muted-foreground mt-1">
                        +{referral.reward_points} points
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Rules */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold">Earn Points When:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Friend signs up: +100 points</li>
                <li>• Friend makes first purchase: +50 points</li>
                <li>• Friend books first repair: +25 points</li>
                <li>• Milestone bonuses for 5/10/25 referrals</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Important Notes:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Points expire after 1 year</li>
                <li>• No self-referrals allowed</li>
                <li>• Duplicate accounts blocked</li>
                <li>• Convert points to wallet cash</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}