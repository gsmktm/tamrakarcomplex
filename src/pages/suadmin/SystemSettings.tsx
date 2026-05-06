import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { toast } from "sonner";

const REQUIRED_SETTINGS = [
  { key: "site_name", category: "general", type: "text" },
  { key: "site_logo", category: "general", type: "text" },
  { key: "site_phone", category: "general", type: "text" },
  { key: "site_email", category: "general", type: "text" },
  { key: "whatsapp_number", category: "general", type: "text" },
  { key: "default_currency", category: "payment", type: "text" },
  { key: "enable_marketplace", category: "marketplace", type: "boolean" },
  { key: "enable_store_registration", category: "store", type: "boolean" },
  { key: "enable_repair_booking", category: "repair", type: "boolean" },
  { key: "enable_unlocking_request", category: "unlocking", type: "boolean" },
  { key: "enable_user_rewards", category: "general", type: "boolean" },
  { key: "enable_store_packages", category: "store", type: "boolean" },
  { key: "maintenance_mode", category: "maintenance", type: "boolean" },
  { key: "homepage_hero_title", category: "homepage", type: "text" },
  { key: "homepage_hero_subtitle", category: "homepage", type: "text" },
  { key: "homepage_sections", category: "homepage", type: "text" },
  { key: "seo_default_title", category: "seo", type: "text" },
  { key: "seo_default_description", category: "seo", type: "text" },
] as const;

type SettingInputState = Record<string, string | boolean>;

export default function SystemSettings() {
  const { data, loading, error, updateMultipleSettings, refetch } = useSystemSettings();
  const [saving, setSaving] = useState(false);

  const initialState = useMemo<SettingInputState>(() => {
    const next: SettingInputState = {};
    for (const setting of REQUIRED_SETTINGS) {
      const row = data.find((item) => item.key === setting.key);
      if (setting.type === "boolean") {
        next[setting.key] = Boolean(row?.value);
      } else {
        next[setting.key] = typeof row?.value === "string" ? row.value : "";
      }
    }
    return next;
  }, [data]);

  const [formState, setFormState] = useState<SettingInputState>(initialState);

  useEffect(() => {
    setFormState(initialState);
  }, [initialState]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateMultipleSettings(
        REQUIRED_SETTINGS.map((setting) => ({
          key: setting.key,
          category: setting.category,
          value: formState[setting.key],
          description: null,
        })),
      );
      await refetch();
      toast.success("System settings saved.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save settings.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Central platform settings backed by `system_settings`.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Core Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {REQUIRED_SETTINGS.map((setting) => (
            <div key={setting.key} className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor={setting.key}>{setting.key}</Label>
                <p className="text-xs text-muted-foreground">Category: {setting.category}</p>
              </div>
              {setting.type === "boolean" ? (
                <Switch
                  id={setting.key}
                  checked={Boolean(formState[setting.key])}
                  onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, [setting.key]: checked }))}
                />
              ) : (
                <Input
                  id={setting.key}
                  className="max-w-md"
                  value={String(formState[setting.key] ?? "")}
                  onChange={(event) => setFormState((prev) => ({ ...prev, [setting.key]: event.target.value }))}
                />
              )}
            </div>
          ))}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
