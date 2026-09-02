import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RepairDiagnostic {
  id: string;
  symptom_id: string;
  title: string;
  severity: string;
  cost_range: string;
  symptom_description: string;
  solution_description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAllDiagnostics() {
  return useQuery({
    queryKey: ["repair-diagnostics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_diagnostics")
        .select("*")
        .eq("is_active", true);
      if (error) {
        const code = (error as { code?: string })?.code ?? "";
        const msg = (error as { message?: string })?.message?.toLowerCase() ?? "";
        if (code === "PGRST205" || code === "PGRST200" || msg.includes("schema cache") || msg.includes("could not find the table")) return [];
        throw error;
      }
      return (data ?? []) as RepairDiagnostic[];
    },
  });
}

export function useDiagnosticsBySymptom(symptomId: string | null) {
  const { data: allDiagnoses, isLoading } = useAllDiagnostics();

  const currentDiagnoses = symptomId && allDiagnoses
    ? allDiagnoses.filter(d => d.symptom_id === symptomId)
    : [];

  return { data: currentDiagnoses, isLoading };
}
