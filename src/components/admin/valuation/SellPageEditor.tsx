
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save } from "lucide-react";

export function SellPageEditor() {
  const queryClient = useQueryClient();
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [content, setContent] = useState({
    headline: "",
    subheadline: "",
    step1_title: "",
    step2_title: "",
    step3_title: ""
  });
  const [newBrand, setNewBrand] = useState("");
  const [newLogoUrl, setNewLogoUrl] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-sell-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["sell_phone_logos", "sell_phone_content"]);
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (settings) {
      const logoSetting = settings.find(s => s.key === "sell_phone_logos");
      const contentSetting = settings.find(s => s.key === "sell_phone_content");
      if (logoSetting) setLogos(logoSetting.value as Record<string, string>);
      if (contentSetting) setContent(contentSetting.value as unknown as typeof content);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error: logoError } = await supabase
        .from("app_settings")
        .upsert({ key: "sell_phone_logos", value: logos });
      if (logoError) throw logoError;

      const { error: contentError } = await supabase
        .from("app_settings")
        .upsert({ key: "sell_phone_content", value: content });
      if (contentError) throw contentError;
    },
    onSuccess: () => {
      toast.success("Settings saved successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-sell-settings"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to save settings: " + error.message);
    }
  });

  const handleAddLogo = () => {
    if (!newBrand || !newLogoUrl) return;
    setLogos(prev => ({ ...prev, [newBrand]: newLogoUrl }));
    setNewBrand("");
    setNewLogoUrl("");
  };

  const handleRemoveLogo = (brand: string) => {
    const newLogos = { ...logos };
    delete newLogos[brand];
    setLogos(newLogos);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Page Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Headline</Label>
            <Input 
              value={content.headline} 
              onChange={e => setContent(prev => ({ ...prev, headline: e.target.value }))} 
            />
          </div>
          <div className="grid gap-2">
            <Label>Subheadline</Label>
            <Input 
              value={content.subheadline} 
              onChange={e => setContent(prev => ({ ...prev, subheadline: e.target.value }))} 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Step 1 Title</Label>
              <Input 
                value={content.step1_title} 
                onChange={e => setContent(prev => ({ ...prev, step1_title: e.target.value }))} 
              />
            </div>
            <div className="grid gap-2">
              <Label>Step 2 Title</Label>
              <Input 
                value={content.step2_title} 
                onChange={e => setContent(prev => ({ ...prev, step2_title: e.target.value }))} 
              />
            </div>
            <div className="grid gap-2">
              <Label>Step 3 Title</Label>
              <Input 
                value={content.step3_title} 
                onChange={e => setContent(prev => ({ ...prev, step3_title: e.target.value }))} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand Logos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4 items-end bg-secondary/20 p-4 rounded-lg">
            <div className="grid gap-2 flex-1">
              <Label>Brand Name</Label>
              <Input placeholder="Apple" value={newBrand} onChange={e => setNewBrand(e.target.value)} />
            </div>
            <div className="grid gap-2 flex-[2]">
              <Label>Logo URL (SVG preferred)</Label>
              <Input placeholder="https://..." value={newLogoUrl} onChange={e => setNewLogoUrl(e.target.value)} />
            </div>
            <Button onClick={handleAddLogo} type="button">
              <Plus className="h-4 w-4 mr-2" /> Add Logo
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(logos).map(([brand, url]) => (
              <div key={brand} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:shadow-sm transition-all group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-8 w-8 flex-shrink-0">
                    <img src={url} alt={brand} className="h-full w-full object-contain" />
                  </div>
                  <span className="text-sm font-medium truncate">{brand}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveLogo(brand)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end sticky bottom-4 z-10">
        <Button 
          size="lg" 
          onClick={() => saveMutation.mutate()} 
          disabled={saveMutation.isPending}
          className="shadow-xl"
        >
          {saveMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
