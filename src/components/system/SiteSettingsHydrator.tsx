import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mergeAppSettings, mergeThemeSettings, writeAppSettings, writeThemeSettings } from "@/lib/siteSettings";

export function SiteSettingsHydrator() {
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["site_info", "contact_info", "features", "theme_settings"]);

      if (error || cancelled) {
        return;
      }

      const appSettingsSeed: Record<string, unknown> = {};
      let themeSettingsSeed: unknown = null;

      for (const row of data ?? []) {
        if (row.key === "theme_settings") {
          themeSettingsSeed = row.value;
          continue;
        }

        appSettingsSeed[row.key] = row.value;
      }

      writeAppSettings(mergeAppSettings(appSettingsSeed));

      if (themeSettingsSeed) {
        writeThemeSettings(mergeThemeSettings(themeSettingsSeed));
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
