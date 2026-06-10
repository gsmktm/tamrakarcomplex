import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/utils";

type CrudOptions = {
  table: string;
  queryKey: string;
  orderBy?: string;
  /** ms — how long fetched data is considered fresh. Default: 5 minutes. */
  staleTime?: number;
};

export function useCrudResource<T extends { id?: string }>(options: CrudOptions) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [options.queryKey],
    // Reference/catalogue tables (brands, categories) stay fresh a long time.
    // Callers can override via options.staleTime.
    staleTime: options.staleTime ?? 5 * 60 * 1000,
    queryFn: async () => {
      let request = supabase.from(options.table).select("*");
      if (options.orderBy) {
        request = request.order(options.orderBy, { ascending: false });
      }
      const { data, error } = await request;
      // Silently return empty for tables not yet in the live schema (PGRST205)
      if (error) {
        if ((error as any).code === "PGRST205" || (error as any).code === "42P01") return [] as T[];
        throw error;
      }
      return (data as T[]) ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<T>) => {
      const { data, error } = await supabase.from(options.table).insert(payload).select("*").single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [options.queryKey] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<T> }) => {
      const { data, error } = await supabase.from(options.table).update(payload).eq("id", id).select("*").single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [options.queryKey] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(options.table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [options.queryKey] });
    },
  });

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
}
