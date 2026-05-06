import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type RepairRequestInput = {
  device_brand: string;
  device_model: string;
  issue_type: string;
  phone: string;
  location: string;
  name?: string;
};

export const useRepairSubmit = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: RepairRequestInput) => {
      if (!user) {
        throw new Error("Authentication required");
      }

      const { data, error } = await supabase
        .from("repair_requests")
        .insert([
          {
            ...input,
            user_id: user.id,
            name: input.name || user.email || "Guest",
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
};
