import { useCrudResource } from "@/hooks/useCrudResource";

export type StaffTaskRecord = {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  related_module: string | null;
  related_id: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export function useStaffTasks() {
  const resource = useCrudResource<StaffTaskRecord>({
    table: "staff_tasks",
    queryKey: "staff-tasks",
    orderBy: "created_at",
  });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    createTask: resource.create,
    updateTask: resource.update,
    assignTask: resource.update,
    changeTaskStatus: (id: string, status: string) => resource.update({ id, payload: { status } }),
    deleteTask: resource.remove,
    listTasksByStaff: resource.refetch,
    listAllTasks: resource.refetch,
  };
}
