import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStoreTasks } from "@/hooks/useStoreTasks";
import { toast } from "sonner";

export default function StoreAdminTaskManager() {
  const { data, loading, error, createTask, updateTask, refetch } = useStoreTasks();
  const [storeId, setStoreId] = useState("");
  const [title, setTitle] = useState("");

  const handleCreate = async () => {
    if (!storeId.trim() || !title.trim()) {
      toast.error("Store ID and title are required.");
      return;
    }
    try {
      await createTask({ store_id: storeId, title, status: "pending", priority: "medium" });
      setTitle("");
      toast.success("Store task created.");
      await refetch();
    } catch (taskError) {
      const message = taskError instanceof Error ? taskError.message : "Failed to create task.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Admin Tasks</h1>
        <p className="text-muted-foreground">Assign and track tasks for store administrators.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Merchant Task Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Store ID" value={storeId} onChange={(event) => setStoreId(event.target.value)} />
            <Input placeholder="Task title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Button onClick={handleCreate}>Create Task</Button>
          </div>

          {loading ? <p className="text-sm text-muted-foreground">Loading tasks...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {!loading && data.length === 0 ? <p className="text-sm text-muted-foreground">No tasks found.</p> : null}

          <div className="space-y-2">
            {data.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium">{task.title ?? "Untitled task"}</p>
                  <p className="text-xs text-muted-foreground">Store: {task.store_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{task.status ?? "pending"}</Badge>
                  {task.status !== "completed" ? (
                    <Button variant="outline" size="sm" onClick={() => void updateTask({ id: task.id, payload: { status: "completed" } })}>
                      Mark Completed
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
