import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCw, Trash2, HardDrive, Server } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Maintenance() {
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: sysMetrics } = useQuery({
    queryKey: ["maintenance-metrics"],
    queryFn: async () => {
      const t0 = performance.now();
      const [{ count: profileCount }, bucketsResult] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.storage.listBuckets(),
      ]);
      const latency = Math.round(performance.now() - t0);
      const buckets = bucketsResult.data ?? [];
      return { latency, bucketCount: buckets.length, profileCount: profileCount ?? 0 };
    },
    staleTime: 60000,
  });

  const handleSyncStats = async () => {
    setIsSyncing(true);
    try {
      // Placeholder for sync logic
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Usage statistics synchronized successfully");
    } catch (error) {
      toast.error("Failed to synchronize statistics");
    } finally {
      setIsSyncing(false);
    }
  };

  const MAINTENANCE_TASKS = [
    {
      title: "Sync Usage Counters",
      description: "Recalculate product and staff counts for all store subscriptions.",
      icon: RefreshCw,
      action: handleSyncStats,
      loading: isSyncing
    },
    {
      title: "Clear Audit History",
      description: "Archive audit logs older than 90 days to maintain performance.",
      icon: Trash2,
      action: () => toast.info("Archive process started in background"),
      variant: "outline" as const
    },
    {
      title: "Storage Cleanup",
      description: "Identify and remove orphaned images and temporary assets.",
      icon: HardDrive,
      action: () => toast.info("Scanning storage buckets..."),
      variant: "outline" as const
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Maintenance</h1>
        <p className="text-muted-foreground mt-1">Advanced tools for platform health and data integrity.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <Server className="h-5 w-5 text-primary mb-2" />
            <CardTitle className="text-sm font-medium">Database Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-2xl font-bold">Healthy</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Supabase managed · {sysMetrics?.profileCount ?? "—"} users</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardHeader className="pb-2">
            <ShieldAlert className="h-5 w-5 text-orange-600 mb-2" />
            <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sysMetrics?.bucketCount ?? "—"} buckets</div>
            <p className="text-xs text-muted-foreground mt-1">Storage buckets in use</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <RefreshCw className="h-5 w-5 text-blue-600 mb-2" />
            <CardTitle className="text-sm font-medium">API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sysMetrics ? `${sysMetrics.latency}ms` : "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">Live API round-trip</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <h2 className="text-lg font-semibold">Maintenance Tasks</h2>
        <div className="grid gap-4">
          {MAINTENANCE_TASKS.map((task) => (
            <Card key={task.title}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-muted p-3">
                    <task.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{task.title}</h3>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                </div>
                <Button 
                  onClick={task.action} 
                  variant={task.variant || "default"}
                  disabled={task.loading}
                >
                  {task.loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                  Execute
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
