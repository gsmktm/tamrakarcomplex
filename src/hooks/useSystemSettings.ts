/**
 * System Settings Hook
 * Uses the actual `app_settings` table (key/value pairs) instead of the
 * non-existent `system_settings` table.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/utils";

export type SystemSettingRow = {
  key: string;
  value: unknown;
  category: string;
  description?: string | null;
  updated_at?: string;
};

export function useSystemSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["system-settings"],
    queryFn: getSystemSettings,
  });

  const upsertMutation = useMutation({
    mutationFn: async (row: SystemSettingRow) =>
      updateSetting(row.key, row.value, row.category, row.description),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["system-settings"] });
    },
  });

  return {
    data: settingsQuery.data ?? [],
    loading: settingsQuery.isLoading,
    error: settingsQuery.error ? getErrorMessage(settingsQuery.error) : null,
    refetch: settingsQuery.refetch,
    getSystemSettings,
    getSetting: (key: string) => getSetting(key, settingsQuery.data ?? []),
    updateSetting: upsertMutation.mutateAsync,
    updateMultipleSettings,
    resetSetting,
  };
}

export async function getSystemSettings(): Promise<SystemSettingRow[]> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value, updated_at")
    .order("key", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    key: row.key,
    value: row.value,
    category: "general",
    description: null,
    updated_at: row.updated_at,
  })) as SystemSettingRow[];
}

export function getSetting(key: string, rows: SystemSettingRow[]): SystemSettingRow | null {
  return rows.find((row) => row.key === key) ?? null;
}

export async function updateSetting(
  key: string,
  value: unknown,
  _category?: string,
  _description?: string | null,
): Promise<SystemSettingRow> {
  const { data, error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
    .select("key, value, updated_at")
    .single();

  if (error) throw error;
  return { key: data.key, value: data.value, category: "general", updated_at: data.updated_at };
}

export async function updateMultipleSettings(
  settings: Array<Pick<SystemSettingRow, "key" | "value" | "category" | "description">>,
) {
  return Promise.all(settings.map((item) => updateSetting(item.key, item.value)));
}

export async function resetSetting(key: string): Promise<void> {
  const { error } = await supabase.from("app_settings").delete().eq("key", key);
  if (error) throw error;
}
