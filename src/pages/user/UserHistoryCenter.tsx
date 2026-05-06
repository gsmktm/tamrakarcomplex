import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Wrench, 
  Unlock, 
  RefreshCw, 
  History, 
  Loader2,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { cn } from "@/lib/utils";
import { OrderTrackingTimeline, OrderStatus } from "@/components/orders/OrderTrackingTimeline";

interface HistoryItem {
  id: string;
  activity_id: string;
  activity_type: string;
  title: string;
  description?: string;
  status?: string;
  created_at: string;
  updated_at?: string;
  amount?: number;
  currency?: string;
  link?: string;
}

export default function UserHistoryCenter({ defaultTab }: { defaultTab?: string }) {
  const { user } = useAuth();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: ["my-history", user?.id],
    queryFn: async () => {
      // Note: get_my_history is a complex RPC that aggregates data from multiple tables
      const { data, error } = await supabase.rpc("get_my_history");
      if (error) {
        console.error("Error fetching history:", error);
        // Fallback to empty array if RPC fails
        return [];
      }
      return data as HistoryItem[];
    },
    enabled: !!user?.id,
  });

  const filteredHistory = history?.filter((item: HistoryItem) => {
    if (!defaultTab) return true;
    const tab = defaultTab.toLowerCase();
    if (tab === "orders") return item.activity_type === "order";
    if (tab === "repairs") return item.activity_type === "repair";
    if (tab === "exchanges") return item.activity_type === "exchange" || item.activity_type === "unlock";
    if (tab === "listings") return item.activity_type === "listing";
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  const title = defaultTab ? `${defaultTab.charAt(0).toUpperCase() + defaultTab.slice(1)} History` : "Activity History";

  return (
    <div className="flex min-h-screen flex-col">
      <SEO title={title} noindex />
      <Header />
      <main className="flex-1 bg-secondary/20 py-8">
        <div className="container space-y-8 animate-in fade-in duration-500">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Activity History</h1>
            <p className="text-muted-foreground mt-1">Track all your orders, repairs, and service requests.</p>
          </div>

          <div className="grid gap-6">
            {filteredHistory?.map((item: HistoryItem, idx: number) => {
              const isExpanded = expandedItem === item.activity_id;
              
              return (
                <Card key={idx} className={cn(
                  "overflow-hidden transition-all duration-300",
                  isExpanded ? "ring-2 ring-primary/20 shadow-xl" : "hover:shadow-md"
                )}>
                  <CardContent className="p-0">
                    <div 
                      className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-secondary/10 transition-colors"
                      onClick={() => setExpandedItem(isExpanded ? null : item.activity_id)}
                    >
                      <div className="flex gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-500",
                          isExpanded && "scale-110 rotate-3"
                        )}>
                          {item.activity_type === 'order' && <div className="bg-blue-500/10 p-2.5 rounded-xl"><Package className="h-6 w-6 text-blue-500" /></div>}
                          {item.activity_type === 'repair' && <div className="bg-orange-500/10 p-2.5 rounded-xl"><Wrench className="h-6 w-6 text-orange-500" /></div>}
                          {item.activity_type === 'unlock' && <div className="bg-green-500/10 p-2.5 rounded-xl"><Unlock className="h-6 w-6 text-green-500" /></div>}
                          {item.activity_type === 'exchange' && <div className="bg-purple-500/10 p-2.5 rounded-xl"><RefreshCw className="h-6 w-6 text-purple-500" /></div>}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold capitalize">{item.activity_type} Request</h3>
                            <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md">
                              {item.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 font-medium opacity-60">
                            {format(new Date(item.created_at), "MMMM d, yyyy 'at' HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-6 pb-6 pt-2 border-t border-dashed bg-secondary/5 animate-in slide-in-from-top-2 duration-300">
                        {item.activity_type === 'order' && (
                          <div className="space-y-6">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Live Tracking</h4>
                            <OrderTrackingTimeline 
                              status={item.status as OrderStatus} 
                              createdAt={item.created_at} 
                              updatedAt={item.updated_at || item.created_at} 
                            />
                            <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
                              <Button variant="outline" size="sm" className="rounded-lg h-9 px-4" asChild>
                                <Link to={`/order-success?oid=${item.activity_id}`}>
                                  Order Summary
                                </Link>
                              </Button>
                              <Button variant="secondary" size="sm" className="rounded-lg h-9 px-4">
                                Contact Support
                              </Button>
                            </div>
                          </div>
                        )}
                        {item.activity_type !== 'order' && (
                          <div className="py-4">
                            <p className="text-sm text-muted-foreground bg-white p-4 rounded-xl border border-border/50 italic">
                              Additional details and real-time tracking for {item.activity_type} requests are coming soon.
                            </p>
                            <div className="mt-4 flex gap-2">
                              {item.activity_type === 'listing' ? (
                                <Button variant="outline" size="sm" asChild className="rounded-lg">
                                  <Link to={`/marketplace/listing/${item.activity_id}`}>
                                    View Listing
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                  </Link>
                                </Button>
                              ) : item.activity_type === 'repair' ? (
                                <Button variant="outline" size="sm" asChild className="rounded-lg">
                                  <Link to={`/repair/track?id=${item.activity_id}`}>
                                    Track Repair
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                  </Link>
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {filteredHistory?.length === 0 && (
              <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
                <History className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                <h3 className="text-xl font-bold">No {defaultTab || "activity"} found</h3>
                <p className="text-muted-foreground mt-1">You haven't made any {defaultTab || "requests"} yet.</p>
                <Button className="mt-6" asChild>
                  <Link to="/">Start Exploring</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
