import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/utils";

export function useStaffPerformance() {
  const query = useQuery({
    queryKey: ["staff-performance-summary"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("staff_performance_summary").select("*");
        if (error) return [];
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
    refetch: query.refetch,
  };
}
