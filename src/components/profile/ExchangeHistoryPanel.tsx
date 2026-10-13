import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { safeId } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Eye } from "lucide-react";
import { format } from "date-fns";

export function ExchangeHistoryPanel() {
  const { user } = useAuth();

  const { data: exchanges, isLoading } = useQuery({
    queryKey: ["my-exchanges", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads_quotes")
        .select("*")
        .eq("user_id", user!.id)
        .eq("type", "exchange")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div>Loading exchanges...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Exchange History</h2>
        <p className="text-muted-foreground">Track your device exchange requests</p>
      </div>

      {exchanges?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold mb-2">No exchanges yet</h3>
            <p className="text-sm text-muted-foreground text-center">
              Your exchange history will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {exchanges?.map((exchange) => (
            <Card key={safeId(exchange.id)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Exchange Request #{exchange.id.slice(-8)}</CardTitle>
                  <Badge variant={exchange.status === "completed" ? "default" : "secondary"}>
                    {exchange.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(exchange.created_at), "PPP")}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <strong>Quoted Value:</strong> Rs. {exchange.quoted_value}
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
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