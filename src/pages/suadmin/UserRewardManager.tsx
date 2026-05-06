import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCrudResource } from "@/hooks/useCrudResource";
import { toast } from "sonner";

export default function UserRewardManager() {
  const rewards = useCrudResource<{ id: string; user_id: string; points: number; tier: string }>({
    table: "user_rewards",
    queryKey: "user-rewards",
    orderBy: "updated_at",
  });
  const [userId, setUserId] = useState("");
  const [points, setPoints] = useState("0");

  const handleAdd = async () => {
    try {
      await rewards.create({ user_id: userId, points: Number(points), tier: "basic" });
      setUserId("");
      setPoints("0");
      toast.success("Reward created.");
      await rewards.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save reward.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Rewards</h1>
        <p className="text-muted-foreground">Manage platform loyalty points and reward systems.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Rewards Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="User ID" value={userId} onChange={(event) => setUserId(event.target.value)} />
            <Input placeholder="Points" type="number" value={points} onChange={(event) => setPoints(event.target.value)} />
            <Button onClick={handleAdd}>Add Reward</Button>
          </div>
          {rewards.loading ? <p className="text-sm text-muted-foreground">Loading rewards...</p> : null}
          {rewards.error ? <p className="text-sm text-red-600">{rewards.error}</p> : null}
          {!rewards.loading && rewards.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reward records found.</p>
          ) : null}
          <div className="space-y-2">
            {rewards.data.map((row) => (
              <div key={row.id} className="rounded border p-3 text-sm">
                User: {row.user_id} | Points: {row.points} | Tier: {row.tier}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
