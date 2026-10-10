import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { JsonValue } from "@/types/common";
import { DEFAULT_HOME_SECTIONS } from "@/lib/homepageSectionVisibility";

export type HomepageSetting = {
  id: string;
  key: string;
  value: JsonValue;
  updated_at: string;
};

const DEFAULT_SETTINGS: Record<string, JsonValue> = { ...DEFAULT_HOME_SECTIONS };

export const useHomepageSettings = () => {
  return useQuery({
    queryKey: ["homepage_settings"],
    queryFn: async () => {
      try {
        // Try homepage_settings table first
        const { data, error } = await supabase
          .from("homepage_settings")
          .select("*");

        if (!error && data?.length) {
          return data.reduce((acc: Record<string, JsonValue>, item: HomepageSetting) => {
            acc[item.key] = item.value;
            return acc;
          }, { ...DEFAULT_SETTINGS });
        }

        // Fall back to app_settings key "sections_control"
        const { data: appData } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "sections_control")
          .maybeSingle();

        if (appData?.value && typeof appData.value === "object") {
          return { ...DEFAULT_SETTINGS, ...(appData.value as Record<string, JsonValue>) };
        }

        return DEFAULT_SETTINGS;
      } catch {
        return DEFAULT_SETTINGS;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
};
