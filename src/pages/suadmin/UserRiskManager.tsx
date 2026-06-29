import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ShieldAlert, 
  Search, 
  Plus, 
  AlertTriangle, 
  UserX, 
  History, 
  ShieldCheck,
  Loader2,
  Trash2,
  Lock,
  Unlock,
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function UserRiskManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFlagUserOpen, setIsFlagUserOpen] = useState(false);
  const [newFlag, setNewFlag] = useState({
    user_id: "",
    risk_level: "medium" as "low" | "medium" | "high" | "critical",
    reason: "",
    action: "none" as "none" | "suspend" | "restrict_purchases" | "shadow_ban"
  });

  const { data: riskFlags, isLoading } = useQuery({
    queryKey: ["user-risk-flags-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_risk_flags")
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
    queryKey: ["user-risk-stats"],
    queryFn: async () => {
      const { count: totalFlagged } = await supabase.from("user_risk_flags").select("*", { count: "exact", head: true });
      const { count: highRisk } = await supabase.from("user_risk_flags").select("*", { count: "exact", head: true }).in("risk_level", ["high", "critical"]);
      const { count: pendingReviews } = await supabase.from("user_risk_flags").select("*", { count: "exact", head: true }).eq("reviewed", false);

      return {
        total_flagged: totalFlagged ?? 0,
        high_risk_count: highRisk ?? 0,
        pending_reviews: pendingReviews ?? 0,
        system_blocks: 0,
      };
    }
  });

  const addFlagMutation = useMutation({
    mutationFn: async (values: typeof newFlag) => {
      const { error } = await supabase.from("user_risk_flags").insert({
        user_id: values.user_id,
        risk_level: values.risk_level,
        reason: values.reason,
        metadata: { action_taken: values.action }
      });
      if (error) throw error;

      // Suspension: stored in metadata only — profiles.is_suspended column does not exist
      // Actual enforcement is via the risk flag metadata read in auth middleware
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-risk-flags-list"] });
      queryClient.invalidateQueries({ queryKey: ["user-risk-stats"] });
      toast.success("User flagged and action applied");
      setIsFlagUserOpen(false);
      setNewFlag({ user_id: "", risk_level: "medium", reason: "", action: "none" });
    },
    onError: (error: any) => {
      toast.error(`Failed to flag user: ${error.message}`);
    }
  });

  const deleteFlagMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_risk_flags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-risk-flags-list"] });
      toast.success("Risk flag removed");
    }
  });

  const filteredFlags = riskFlags?.filter(f => 
    f.profiles?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-red-500" />
            User Risk Control
          </h1>
          <p className="text-muted-foreground">Monitor suspicious activities and manage user restrictions.</p>
        </div>
        <Dialog open={isFlagUserOpen} onOpenChange={setIsFlagUserOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Plus className="h-4 w-4 mr-2" />
              Flag User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Flag User for Risk</DialogTitle>
              <DialogDescription>Mark a user account for manual review or apply immediate restrictions.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>User ID / Email</Label>
                <Input 
                  placeholder="user-uuid-or-email" 
                  value={newFlag.user_id}
                  onChange={(e) => setNewFlag({ ...newFlag, user_id: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Risk Level</Label>
                <Select 
                  value={newFlag.risk_level} 
                  onValueChange={(v: any) => setNewFlag({ ...newFlag, risk_level: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (Watchlist)</SelectItem>
                    <SelectItem value="medium">Medium (Review Needed)</SelectItem>
                    <SelectItem value="high">High (Restricted)</SelectItem>
                    <SelectItem value="critical">Critical (Block Imminent)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Immediate Action</Label>
                <Select 
                  value={newFlag.action} 
                  onValueChange={(v: any) => setNewFlag({ ...newFlag, action: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Review Only)</SelectItem>
                    <SelectItem value="restrict_purchases">Restrict Purchases</SelectItem>
                    <SelectItem value="shadow_ban">Shadow Ban</SelectItem>
                    <SelectItem value="suspend">Immediate Suspension</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Reason / Evidence</Label>
                <Textarea 
                  placeholder="Describe the suspicious behavior..." 
                  value={newFlag.reason}
                  onChange={(e) => setNewFlag({ ...newFlag, reason: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFlagUserOpen(false)}>Cancel</Button>
              <Button 
                variant="destructive"
                onClick={() => addFlagMutation.mutate(newFlag)}
                disabled={addFlagMutation.isPending || !newFlag.user_id}
              >
                {addFlagMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Flag & Apply Action
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-red-500/5 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserX className="h-4 w-4 text-red-500" />
              Total Flagged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_flagged || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique accounts</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              High Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.high_risk_count || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires urgent action</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4 text-blue-500" />
              Pending Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_reviews ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-500/5 border-slate-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              Auto-Blocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.system_blocks ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Active Risk Flags
              </CardTitle>
              <CardDescription>Accounts currently under monitoring or restriction.</CardDescription>
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
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Flagged</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredFlags?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                      No risk flags found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFlags?.map((flag) => (
                    <TableRow key={flag.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{flag.profiles?.display_name || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground">{flag.profiles?.email || flag.user_id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "capitalize text-[10px]",
                          flag.risk_level === 'critical' ? "bg-red-100 text-red-700 border-red-200" :
                          flag.risk_level === 'high' ? "bg-orange-100 text-orange-700 border-orange-200" :
                          flag.risk_level === 'medium' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                          "bg-slate-100 text-slate-700 border-slate-200"
                        )}>
                          {flag.risk_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[250px] truncate">
                        {flag.reason || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {flag.status || 'pending_review'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(flag.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => {
                              if (confirm("Remove this risk flag?")) {
                                deleteFlagMutation.mutate(flag.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
