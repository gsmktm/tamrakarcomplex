import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { readThemeSettings, writeThemeSettings } from "@/lib/siteSettings";
import { isAdminRole } from "@/lib/roles";
import type { AppRole, StoreThemeSettings, ThemeButtonStyle } from "@/types/app";

const DEFAULT_FONT_FAMILY = "Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'";
const DEFAULT_SECTIONS = [
  { key: "hero", label: "Hero Banner", enabled: true },
  { key: "latestNews", label: "Latest News", enabled: true },
  { key: "featured", label: "Featured Gadgets", enabled: true },
  { key: "brandSearch", label: "Brand Search", enabled: true },
  { key: "guides", label: "Guides", enabled: true },
  { key: "comparison", label: "Comparison", enabled: true },
  { key: "poll", label: "Poll", enabled: true },
  { key: "chat", label: "Chat Widget", enabled: true },
];

export const FrontendLiveEditor = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#8b5cf6");
  const [secondaryColor, setSecondaryColor] = useState("#22c55e");
  const [fontFamily, setFontFamily] = useState(DEFAULT_FONT_FAMILY);
  const [radius, setRadius] = useState<number>(12);
  const [buttonStyle, setButtonStyle] = useState<ThemeButtonStyle>("rounded");
  const [containerMaxWidth, setContainerMaxWidth] = useState<number>(1200);
  const [sections, setSections] = useState<Array<{ key: string; label: string; enabled: boolean }>>([]);

  const { data: roles } = useQuery({
    queryKey: ["live-editor-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (error) throw error;
      return (data || []).map((r) => r.role);
    },
    enabled: !!user?.id,
  });
  const canUse = !!user && (roles || []).some((r) => isAdminRole(r as AppRole));

  useEffect(() => {
    try {
      const parsed = readThemeSettings() as StoreThemeSettings;
      setPrimaryColor(parsed?.primaryColor || "#8b5cf6");
      setSecondaryColor(parsed?.secondaryColor || "#22c55e");
      setFontFamily(parsed?.fontFamily || DEFAULT_FONT_FAMILY);
      setRadius(parsed?.radius ?? 12);
      setButtonStyle(parsed?.buttonStyle || "rounded");
      setContainerMaxWidth(parsed?.containerMaxWidth ?? 1200);
      setSections(parsed?.sections || DEFAULT_SECTIONS);
    } catch {
      // Ignore malformed local theme settings and use defaults.
      setSections(DEFAULT_SECTIONS);
    }
  }, []);

  const applyRuntime = () => {
    try {
      const root = document.documentElement;
      root.style.setProperty("--primary", primaryColor);
      root.style.setProperty("--secondary", secondaryColor);
      root.style.setProperty("--radius", `${radius}px`);
      root.style.setProperty("--container-max-width", `${containerMaxWidth}px`);
      document.body.style.fontFamily = fontFamily;
      toast.success("Applied live theme");
    } catch {
      toast.error("Failed to apply");
    }
  };

  const saveAll = () => {
    const payload = {
      ...readThemeSettings(),
      primaryColor,
      secondaryColor,
      fontFamily,
      radius,
      buttonStyle,
      containerMaxWidth,
      sections,
    };
    writeThemeSettings(payload);
    toast.success("Saved theme");
  };

  const toggleSection = (key: string, enabled: boolean) => {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, enabled } : s)));
  };
  const moveSection = (index: number, dir: "up" | "down") => {
    setSections((prev) => {
      const arr = [...prev];
      const target = dir === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return prev;
      const tmp = arr[target];
      arr[target] = arr[index];
      arr[index] = tmp;
      return arr;
    });
  };

  if (!canUse) return null;

  return (
    <>
      {!open && (
        <Button
          className="fixed right-4 bottom-36 z-50 rounded-full h-12 w-12 p-0 shadow-lg"
          variant="outline"
          onClick={() => setOpen(true)}
        >
          ⚙️
        </Button>
      )}
      {open && (
        <Card className="fixed right-4 bottom-36 z-50 w-[360px] shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Live Editor</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={applyRuntime}>Apply</Button>
              <Button onClick={saveAll}>Save</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>✕</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Primary</Label>
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-full rounded border" />
              </div>
              <div className="space-y-2">
                <Label>Secondary</Label>
                <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-10 w-full rounded border" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Font</Label>
              <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="flex h-10 w-full rounded-md border px-3 text-sm">
                <option value="Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'">Inter</option>
                <option value="Outfit, Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial">Outfit</option>
                <option value="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial">System UI</option>
                <option value="Georgia, Cambria, 'Times New Roman', Times, serif">Serif</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Radius</Label>
                <input type="range" min={0} max={24} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Button Style</Label>
                <select value={buttonStyle} onChange={(e) => setButtonStyle(e.target.value as ThemeButtonStyle)} className="flex h-10 w-full rounded-md border px-3 text-sm">
                  <option value="rounded">Rounded</option>
                  <option value="pill">Pill</option>
                  <option value="square">Square</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Container Max Width</Label>
              <input type="number" value={containerMaxWidth} onChange={(e) => setContainerMaxWidth(Number(e.target.value))} className="flex h-10 w-full rounded-md border px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Homepage Sections</Label>
              <div className="space-y-2">
                {sections.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-2 border rounded p-2">
                    <div className="flex-1">
                      <div className="text-sm">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.key}</div>
                    </div>
                    <Switch checked={s.enabled} onCheckedChange={(v) => toggleSection(s.key, v)} />
                    <Button variant="outline" size="sm" onClick={() => moveSection(i, "up")}>↑</Button>
                    <Button variant="outline" size="sm" onClick={() => moveSection(i, "down")}>↓</Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
