import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Trophy, 
  Gift, 
  Search, 
  Plus, 
  ArrowUpRight, 
  History, 
  Users,
  Loader2,
  Trash2,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function UserRewardManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddRewardOpen, setIsAddRewardOpen] = useState(false);
  const [newReward, setNewReward] = useState({
    user_id: "",
    points: 0,
    reason: "",
    type: "bonus" as "bonus" | "referral" | "purchase" | "adjustment"
  });

  const { data: rewards, isLoading } = useQuery({
    queryKey: ["user-rewards-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_points")
        .select(`
          *,
          profiles:user_id (display_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const { data: stats } = useQuery({
    queryKey: ["user-rewards-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_points_stats");
      if (error) throw error;
      return data as {
        total_points_issued: number;
        total_points_redeemed: number;
        active_loyalty_users: number;
        top_tier_users: number;
      };
    }
  });

  const addRewardMutation = useMutation({
    mutationFn: async (values: typeof newReward) => {
      const { error } = await supabase.from("user_points").insert({
        user_id: values.user_id,
        points: values.points,
        description: values.reason,
        type: values.type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-rewards-list"] });
      queryClient.invalidateQueries({ queryKey: ["user-rewards-stats"] });
      toast.success("Points issued successfully");
      setIsAddRewardOpen(false);
      setNewReward({ user_id: "", points: 0, reason: "", type: "bonus" });
    },
    onError: (error: any) => {
      toast.error(`Failed to issue points: ${error.message}`);
    }
  });

  const filteredRewards = rewards?.filter(r => 
    r.profiles?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-8 w-8 text-amber-500" />
            User Rewards
          </h1>
          <p className="text-muted-foreground">Manage platform loyalty points and reward systems.</p>
        </div>
        <Dialog open={isAddRewardOpen} onOpenChange={setIsAddRewardOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Issue Points
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue Loyalty Points</DialogTitle>
              <DialogDescription>Manually add points to a user's account for bonuses or adjustments.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>User ID / Email</Label>
                <Input 
                  placeholder="user-uuid-or-email" 
                  value={newReward.user_id}
                  onChange={(e) => setNewReward({ ...newReward, user_id: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Points</Label>
                <Input 
                  type="number" 
                  value={newReward.points}
                  onChange={(e) => setNewReward({ ...newReward, points: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select 
                  value={newReward.type} 
                  onValueChange={(v: any) => setNewReward({ ...newReward, type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="purchase">Purchase Reward</SelectItem>
                    <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Reason</Label>
                <Input 
                  placeholder="Why are these points being issued?" 
                  value={newReward.reason}
                  onChange={(e) => setNewReward({ ...newReward, reason: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddRewardOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => addRewardMutation.mutate(newReward)}
                disabled={addRewardMutation.isPending || !newReward.user_id}
              >
                {addRewardMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Issue Points
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Total Points Issued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_points_issued?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Platform-wide</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-500" />
              Points Redeemed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_points_redeemed?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Converted to vouchers</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Active Loyalty Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_loyalty_users || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Users with &gt; 0 points</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-purple-500" />
              Top Tier Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.top_tier_users || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Diamond & Platinum</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Point Transactions
              </CardTitle>
              <CardDescription>View all point issuance and redemption events.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by user..." 
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredRewards?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                      No reward records found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRewards?.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{reward.profiles?.display_name || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground">{reward.profiles?.email || reward.user_id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-bold",
                          reward.points > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {reward.points > 0 ? "+" : ""}{reward.points}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {reward.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[300px] truncate">
                        {reward.description || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(reward.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
