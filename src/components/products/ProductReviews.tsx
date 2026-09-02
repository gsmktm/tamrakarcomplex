import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Star, MessageSquare, ThumbsUp, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select(`
          *,
          profiles:user_id (display_name, avatar_url)
        `)
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    initialData: [],
    retry: false,
    enabled: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId),
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in to leave a review");
      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        user_id: user.id,
        rating,
        comment,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review submitted successfully");
      setComment("");
      setRating(5);
      queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit review");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    submitReviewMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl font-bold">Customer Reviews</h3>
        <Badge variant="secondary" className="px-3 py-1">
          {reviews?.length || 0} Reviews
        </Badge>
      </div>

      {/* Review Form */}
      {user ? (
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(star)}
                      className="transition-transform active:scale-90"
                    >
                      <Star
                        className={cn(
                          "h-8 w-8 transition-colors",
                          (hoveredRating || rating) >= star
                            ? "fill-rating-star text-rating-star"
                            : "text-muted-foreground/30"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Your Experience</label>
                <Textarea
                  placeholder="Tell us what you like or dislike about this product..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[100px] resize-none border-primary/20 bg-background focus-visible:ring-primary"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full sm:w-auto hero-gradient gap-2"
                disabled={submitReviewMutation.isPending}
              >
                {submitReviewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Post Review
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center bg-muted/20">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h4 className="font-bold">Sign in to share your thoughts</h4>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Your feedback helps others make better choices.</p>
          <Button variant="outline" asChild>
            <a href="/auth">Sign In Now</a>
          </Button>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews?.map((review: any) => (
          <Card key={review.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between gap-4">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary shrink-0">
                    {review.profiles?.display_name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <h5 className="font-bold text-sm">{review.profiles?.display_name || "Verified Buyer"}</h5>
                    <div className="flex gap-0.5 my-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-3 w-3",
                            i < review.rating
                              ? "fill-rating-star text-rating-star"
                              : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  {format(new Date(review.created_at), "MMM d, yyyy")}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {review.comment}
              </p>
              <div className="mt-4 flex items-center gap-4">
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Helpful
                </button>
              </div>
            </CardContent>
          </Card>
        ))}

        {reviews?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground italic">No reviews yet. Be the first to review this product!</p>
          </div>
        )}
      </div>
    </div>
  );
}
