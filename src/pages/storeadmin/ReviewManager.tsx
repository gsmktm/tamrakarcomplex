import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STORE_REVIEWS_COLUMNS } from "@/lib/supabaseColumnMaps";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Star, Trash2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ReviewManager() {
  const { user, role } = useAuth();
  const isSuperAdmin = role === "suadmin";
  const [storeId, setStoreId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // For store admins, find their store
  const { data: userStore } = useQuery({
    queryKey: ["my-store-for-reviews", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id")
        .or(`owner_user_id.eq.${user?.id},owner_id.eq.${user?.id}`)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !isSuperAdmin
  });

  const activeStoreId = isSuperAdmin ? storeId : userStore?.id;

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["store_reviews_admin", activeStoreId],
    queryFn: async () => {
      let query = supabase.from("store_reviews").select(STORE_REVIEWS_COLUMNS.join(","));
      if (activeStoreId) {
        query = query.eq("store_id", activeStoreId);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin || !!activeStoreId
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("store_reviews").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store_reviews_admin"] });
      toast.success("Review status updated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store_reviews_admin"] });
      toast.success("Review deleted");
    }
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Reviews</h1>
        <p className="text-muted-foreground">Monitor and manage customer feedback for your store.</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No reviews found.</TableCell></TableRow>
            ) : reviews?.map((review) => (
              <TableRow key={review.id}>
                <TableCell className="font-medium">{review.customer_name}</TableCell>
                <TableCell>
                  <div className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-current" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate">{review.review_text}</TableCell>
                <TableCell>
                  <Badge variant={review.status === 'active' ? 'default' : review.status === 'pending' ? 'secondary' : 'destructive'}>
                    {review.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(review.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {review.status === 'pending' && (
                    <Button variant="ghost" size="sm" onClick={() => updateStatusMutation.mutate({ id: review.id, status: 'active' })}>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => {
                    if (confirm("Delete this review?")) deleteMutation.mutate(review.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
