import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCrudResource } from "@/hooks/useCrudResource";
import { toast } from "sonner";

export default function PlatformHealth() {
  const health = useCrudResource<{ id: string; service: string; status: string }>({
    table: "platform_health_logs",
    queryKey: "platform-health-logs",
    orderBy: "created_at",
  });
  const [service, setService] = useState("");
  const [status, setStatus] = useState("healthy");

  const handleAdd = async () => {
    try {
      await health.create({ service, status });
      setService("");
      toast.success("Health log added.");
      await health.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add health log.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Health</h1>
        <p className="text-muted-foreground">Real-time monitoring of system services and infrastructure.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Service" value={service} onChange={(event) => setService(event.target.value)} />
            <Input placeholder="Status" value={status} onChange={(event) => setStatus(event.target.value)} />
            <Button onClick={handleAdd}>Add Health Log</Button>
          </div>
          {health.loading ? <p className="text-sm text-muted-foreground">Loading health logs...</p> : null}
          {health.error ? <p className="text-sm text-red-600">{health.error}</p> : null}
          {!health.loading && health.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No health logs yet.</p>
          ) : null}
          <div className="space-y-2">
            {health.data.map((row) => (
              <div key={row.id} className="rounded border p-3 text-sm">
                Service: {row.service} | Status: {row.status}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
