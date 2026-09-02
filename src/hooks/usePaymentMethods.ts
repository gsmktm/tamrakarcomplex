import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CheckoutPaymentMethod = {
  slug: string;
  name: string;
  region: "np" | "intl";
  provider_type: "wallet" | "card" | "bank" | "qr" | "cod" | "gateway";
  mode: "sandbox" | "production" | "demo";
  is_ready: boolean;
  fee_percent: number | null;
  icon_url: string | null;
  display_order: number;
};

/**
 * Enabled payment methods for checkout, from the suadmin-managed
 * payment_providers registry. Secrets are never returned.
 */
export function usePaymentMethods() {
  return useQuery<CheckoutPaymentMethod[]>({
    queryKey: ["checkout-payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_active_payment_providers");
      if (error) throw error;
      return (data ?? []) as unknown as CheckoutPaymentMethod[];
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}
