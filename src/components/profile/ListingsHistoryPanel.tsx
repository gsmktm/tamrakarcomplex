import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Eye, Edit } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export function ListingsHistoryPanel() {
  const { user } = useAuth();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sell_listings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div>Loading listings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Listings</h2>
        <p className="text-muted-foreground">Manage your marketplace listings</p>
      </div>

      {listings?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold mb-2">No listings yet</h3>
            <p className="text-sm text-muted-foreground text-center">
              Your marketplace listings will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {listings?.map((listing) => (
            <Card key={safeId(listing.id)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{listing.title}</CardTitle>
                  <Badge variant={listing.status === "active" ? "default" : "secondary"}>
                    {listing.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {listing.brand} {listing.model} • {format(new Date(listing.created_at), "PPP")}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-lg font-semibold text-primary">
                    Rs. {safeText(listing.price)}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/marketplace/listing/${listing.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/marketplace/edit/${listing.id}`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}