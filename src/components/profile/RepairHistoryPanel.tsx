import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Eye, Phone } from "lucide-react";
import { format } from "date-fns";

export function RepairHistoryPanel() {
  const { user } = useAuth();

  const { data: repairs, isLoading } = useQuery({
    queryKey: ["my-repairs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div>Loading repairs...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Repair History</h2>
        <p className="text-muted-foreground">Track your device repairs and service requests</p>
      </div>

      {repairs?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wrench className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold mb-2">No repair requests</h3>
            <p className="text-sm text-muted-foreground text-center">
              Your repair history will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {repairs?.map((repair) => (
            <Card key={safeId(repair.id)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{repair.device_brand} {repair.device_model}</CardTitle>
                  <Badge variant={repair.status === "completed" ? "default" : "secondary"}>
                    {repair.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Issue: {repair.issue_type} • {format(new Date(repair.created_at), "PPP")}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">{safeText(repair.description)}</p>
                  {safeText(repair.estimated_cost) && (
                    <div className="text-sm">
                      Estimated Cost: Rs. {safeText(repair.estimated_cost)}
                    </div>
                  )}
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}