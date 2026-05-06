import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Coins,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  History,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function PointsWalletPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: walletData, isLoading } = useQuery({
    queryKey: ["my-wallet", user?.id],
    queryFn: async () => {
      const [pointsRes, walletRes, transactionsRes] = await Promise.all([
        supabase.from("profiles").select("referral_points").eq("id", user!.id).single(),
        supabase.from("user_wallets").select("*").eq("user_id", user!.id).single(),
        supabase.from("wallet_transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(10),
      ]);

      return {
        points: pointsRes.data?.referral_points || 0,
        wallet: walletRes.data || { balance: 0, total_earned: 0, total_redeemed: 0 },
        transactions: transactionsRes.data || [],
      };
    },
    enabled: !!user?.id,
  });

  const convertPointsMutation = useMutation({
    mutationFn: async (points: number) => {
      const { data, error } = await supabase.rpc("convert_points_to_wallet", {
        user_id: user!.id,
        points_amount: points,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-wallet"] });
      toast.success("Points converted to wallet successfully!");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Conversion failed";
      toast.error(`Conversion failed: ${message}`);
    },
  });

  const canConvert = (walletData?.points || 0) >= 100;

  if (isLoading) {
    return <div>Loading wallet...</div>;
  }

  const points = walletData?.points || 0;
  const wallet = walletData?.wallet;
  const transactions = walletData?.transactions || [];

  return (
    <div className="space-y-6">
      {/* Points & Wallet Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reward Points</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{points}</div>
            <p className="text-xs text-muted-foreground">
              Earned from referrals and activities
            </p>
            <div className="mt-4">
              <Button
                onClick={() => convertPointsMutation.mutate(100)}
                disabled={!canConvert || convertPointsMutation.isPending}
                className="w-full"
              >
                {convertPointsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <DollarSign className="h-4 w-4 mr-2" />
                )}
                Convert 100 Points to Rs. 10
              </Button>
              {!canConvert && (
                <p className="text-xs text-muted-foreground mt-2">
                  Need at least 100 points to convert
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {wallet?.balance || 0}</div>
            <p className="text-xs text-muted-foreground">
              Available for purchases and services
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span>Total Earned</span>
                <span>Rs. {wallet?.total_earned || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Total Redeemed</span>
                <span>Rs. {wallet?.total_redeemed || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {transaction.type === "credit" ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium capitalize">{safeText(transaction.description)}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(transaction.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${
                      transaction.type === "credit" ? "text-green-600" : "text-red-600"
                    }`}>
                      {transaction.type === "credit" ? "+" : "-"}Rs. {transaction.amount}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Points Conversion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Conversion Rate</h4>
              <div className="text-2xl font-bold text-primary">100 Points = Rs. 10</div>
              <p className="text-sm text-muted-foreground">Minimum 100 points required</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Points Expiry</h4>
              <div className="text-2xl font-bold text-orange-600">1 Year</div>
              <p className="text-sm text-muted-foreground">Unused points expire after 365 days</p>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">Ways to Earn Points</h4>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">+100</Badge>
                <span>Successful referral signup</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">+50</Badge>
                <span>Referral makes purchase</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">+25</Badge>
                <span>Referral books repair</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">+10-50</Badge>
                <span>Milestone bonuses</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}