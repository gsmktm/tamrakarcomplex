import { useCrudResource } from "@/hooks/useCrudResource";

export type StoreTaskRecord = {
  id: string;
  store_id: string;
  assigned_to: string | null;
  assigned_by: string | null;
  title: string | null;
  description: string | null;
  task_type: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export function useStoreTasks() {
  const resource = useCrudResource<StoreTaskRecord>({
    table: "store_tasks",
    queryKey: "store-tasks",
    orderBy: "created_at",
  });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    createTask: resource.create,
    updateTask: resource.update,
    deleteTask: resource.remove,
  };
}
