import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Smartphone, Clock, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

function isSchemaMissingError(error: { code?: string; message?: string } | null) {
  const code = (error?.code as string | undefined) ?? "";
  const message = ((error?.message as string | undefined) ?? "").toLowerCase();
  return (
    code === "PGRST200" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    code === "42703" ||
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    message.includes("could not find a relationship") ||
    message.includes("does not exist")
  );
}

export function UserRepairDashboard() {
  const { user } = useAuth();

  type RepairWithStore = {
    id: string;
    tracking_id: string | null;
    status: string | null;
    device_model: string;
    issue_type: string;
    estimated_cost: number | null;
    created_at: string;
    stores: { name: string; location: string; shop_no: string | null } | null;
  };

  const { data: repairs, isLoading } = useQuery<RepairWithStore[]>({
    queryKey: ["my-repairs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const tryWithJoin = async () =>
        supabase
          .from("repair_requests")
          .select(
            `
            *,
            stores (
              name,
              location,
              shop_no
            )
          `,
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

      const tryBase = async () =>
        supabase
          .from("repair_requests")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

      const joined = await tryWithJoin();
      if (!joined.error) return (joined.data ?? []) as unknown as RepairWithStore[];

      if (isSchemaMissingError(joined.error)) {
        const base = await tryBase();
        if (base.error) throw base.error;
        return (base.data ?? []) as unknown as RepairWithStore[];
      }

      throw joined.error;
    },
    enabled: !!user?.id
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500 hover:bg-blue-600 gap-1"><Clock className="h-3 w-3" /> In Repair</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          My Repair History
        </CardTitle>
        <CardDescription>Track the status of your current and past repairs.</CardDescription>
      </CardHeader>
      <CardContent>
        {repairs?.length === 0 ? (
          <div className="text-center py-12 bg-muted rounded-xl border border-dashed">
            <Smartphone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-lg">No repairs yet</h3>
            <p className="text-muted-foreground mb-6">You haven't booked any repairs yet.</p>
            <Button asChild>
              <Link to="/repair">Find a Repair Guide</Link>
            </Button>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Tracking ID</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repairs?.map((repair) => (
                  <TableRow key={repair.id}>
                    <TableCell className="font-mono text-xs font-bold text-primary">
                      {repair.tracking_id || "-"}
                      <div className="text-[10px] text-muted-foreground font-normal">
                        {format(new Date(repair.created_at), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="font-medium">{repair.device_model}</span>
                        <span className="text-xs text-muted-foreground capitalize">{repair.issue_type?.replace("_", " ")}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {repair.stores ? (
                        <div className="flex flex-col text-xs">
                          <span className="font-medium">{repair.stores.name}</span>
                          <span className="text-muted-foreground">{repair.stores.location}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Pending Assignment</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(repair.status)}</TableCell>
                    <TableCell className="text-sm font-bold">
                      {repair.estimated_cost ? `Rs. ${repair.estimated_cost}` : "Pending Quote"}
                    </TableCell>
                    <TableCell className="text-right">
                      {repair.tracking_id ? (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/repair/track?id=${repair.tracking_id}`} className="gap-2">
                            <Search className="h-3.5 w-3.5" />
                            Track
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" disabled className="gap-2">
                          <Search className="h-3.5 w-3.5" />
                          Track
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
