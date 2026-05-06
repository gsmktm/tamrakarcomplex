import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCrudResource } from "@/hooks/useCrudResource";
import { toast } from "sonner";

export default function UserRiskManager() {
  const risks = useCrudResource<{ id: string; user_id: string; risk_level: string; reason: string | null }>({
    table: "user_risk_flags",
    queryKey: "user-risk-flags",
    orderBy: "created_at",
  });
  const [userId, setUserId] = useState("");
  const [riskLevel, setRiskLevel] = useState("medium");
  const [reason, setReason] = useState("");

  const handleAdd = async () => {
    try {
      await risks.create({ user_id: userId, risk_level: riskLevel, reason });
      setUserId("");
      setReason("");
      toast.success("Risk flag created.");
      await risks.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save risk flag.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Risk Control</h1>
        <p className="text-muted-foreground">Monitor suspicious activities and manage user restrictions.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Security Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="User ID" value={userId} onChange={(event) => setUserId(event.target.value)} />
            <Input placeholder="Risk level" value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)} />
            <Input placeholder="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
            <Button onClick={handleAdd}>Flag User</Button>
          </div>
          {risks.loading ? <p className="text-sm text-muted-foreground">Loading risk flags...</p> : null}
          {risks.error ? <p className="text-sm text-red-600">{risks.error}</p> : null}
          {!risks.loading && risks.data.length === 0 ? <p className="text-sm text-muted-foreground">No risk flags found.</p> : null}
          <div className="space-y-2">
            {risks.data.map((row) => (
              <div key={row.id} className="rounded border p-3 text-sm">
                User: {row.user_id} | Level: {row.risk_level} | Reason: {row.reason ?? "-"}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
