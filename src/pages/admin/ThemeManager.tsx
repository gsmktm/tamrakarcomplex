import { useEffect, useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { Moon, Sun, Plus, Trash2, GripVertical, Settings, Layout, Type, Palette, Save, Monitor, Smartphone, Laptop, Flame, TrendingUp, Newspaper, Tag, MessageSquare, BarChart2, Scale, BookOpen, Facebook, Twitter, Instagram, Youtube, Linkedin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_FOOTER_SETTINGS, DEFAULT_SECTIONS, mergeThemeSettings, readThemeSettings, writeThemeSettings } from "@/lib/siteSettings";
import type { FooterConfig, SectionConfig, StoreThemeSettings } from "@/types/app";
import type { Json } from "@/integrations/supabase/types";

export type { FooterConfig, SectionConfig };

export default function ThemeManager() {
  const { theme, setTheme } = useTheme();
  const [siteName, setSiteName] = useState("Tamrakar Complex");
  const [primaryColor, setPrimaryColor] = useState("#8b5cf6"); // Violet
  const [secondaryColor, setSecondaryColor] = useState("#22c55e");
  const [fontFamily, setFontFamily] = useState("Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'");
  const [radius, setRadius] = useState<number>(12);
  const [buttonStyle, setButtonStyle] = useState<"rounded" | "pill" | "square">("rounded");
  const [containerMaxWidth, setContainerMaxWidth] = useState<number>(1200);
  
  // Default sections matching EcommerceHomeSection components
  const [sections, setSections] = useState<SectionConfig[]>([
    ...DEFAULT_SECTIONS,
  ]);

  const [menuItems, setMenuItems] = useState<Array<{ name: string; href: string }>>([
    { name: "Home", href: "/" },
    { name: "Price List", href: "/mobile-price" },
    { name: "Marketplace", href: "/marketplace" },
    { name: "Stores", href: "/stores" },
    { name: "Services", href: "/services" },
    { name: "Contact", href: "/contact-us" },
  ]);

  const [footerSettings, setFooterSettings] = useState<FooterConfig>({
      ...DEFAULT_FOOTER_SETTINGS,
  });

  const [newSectionLabel, setNewSectionLabel] = useState<string>("");
  const [newSectionKey, setNewSectionKey] = useState<string>("");
  
  // Advanced settings
  const [enableLiveEditor, setEnableLiveEditor] = useState<boolean>(false);
  const [newsHashtags, setNewsHashtags] = useState<string>("#NepalTech,#GadgetLaunches,#PriceUpdate");
  
  // News Settings
  const [newsItemsPerPage, setNewsItemsPerPage] = useState<number>(16);
  const [showPopularProducts, setShowPopularProducts] = useState<boolean>(true);
  const [showFeaturedNews, setShowFeaturedNews] = useState<boolean>(true);

  // Dialog State
  const [editingSection, setEditingSection] = useState<SectionConfig | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const { data: themeSettings, isLoading: isThemeLoading, error: themeError } = useQuery({
    queryKey: ["admin-theme-settings"],
    queryFn: async () => {
      try {
        const localSettings = readThemeSettings();
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "theme_settings")
          .maybeSingle();

        if (error) {
          return localSettings;
        }

        return mergeThemeSettings(data?.value ?? localSettings);
      } catch (err) {
        handleSupabaseError(err, "ThemeManager: Failed to fetch theme settings");
        return readThemeSettings();
      }
    },
    retry: 1,
    staleTime: 60_000,
  });

  useEffect(() => {
    const parsed = themeSettings ?? readThemeSettings();
    setSiteName(parsed.siteName || "Tamrakar Complex");
    setPrimaryColor(parsed.primaryColor || "#8b5cf6");
    setSecondaryColor(parsed.secondaryColor || "#22c55e");
    setFontFamily(parsed.fontFamily || "Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'");
    setRadius(parsed.radius ?? 12);
    setButtonStyle(parsed.buttonStyle || "rounded");
    setContainerMaxWidth(parsed.containerMaxWidth ?? 1200);
    setSections(parsed.sections || DEFAULT_SECTIONS);
    setMenuItems(parsed.menuItems || []);
    setFooterSettings(parsed.footerSettings || DEFAULT_FOOTER_SETTINGS);
    setEnableLiveEditor(parsed.enableLiveEditor ?? false);
    if (parsed.newsHashtags) {
      setNewsHashtags(Array.isArray(parsed.newsHashtags) ? parsed.newsHashtags.join(",") : parsed.newsHashtags);
    }
    setNewsItemsPerPage(parsed.newsItemsPerPage ?? 16);
    setShowPopularProducts(parsed.showPopularProducts ?? true);
    setShowFeaturedNews(parsed.showFeaturedNews ?? true);
    if (parsed.theme) {
      setTheme(parsed.theme);
    }
  }, [setTheme, themeSettings]);

  const buildThemePayload = (): StoreThemeSettings => ({
    siteName,
    primaryColor,
    secondaryColor,
    fontFamily,
    radius,
    buttonStyle,
    containerMaxWidth,
    enableLiveEditor,
    newsHashtags,
    newsItemsPerPage,
    showPopularProducts,
    showFeaturedNews,
    sections,
    menuItems,
    footerSettings,
    theme,
  });

  const saveThemeMutation = useMutation({
    mutationFn: async (payload: StoreThemeSettings) => {
      writeThemeSettings(payload);
      const { error } = await supabase.from("app_settings").upsert(
        {
          key: "theme_settings",
          value: payload as unknown as Json,
        },
        { onConflict: "key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Theme configuration saved");
      applyRuntimeTheme();
    },
    onError: () => {
      toast.error("Failed to save theme configuration");
    },
  });

  const handleSaveConfig = () => {
    saveThemeMutation.mutate(buildThemePayload());
  };

  const applyRuntimeTheme = () => {
    const payload = buildThemePayload();
    writeThemeSettings(payload);
    toast.info("Theme applied locally.");
  };

  // --- Drag and Drop Implementation ---
  const dragSectionSourceIndex = useRef<number | null>(null);
  const dragMenuSourceIndex = useRef<number | null>(null);

  // Section DnD
  const onSectionDragStart = (index: number) => {
    dragSectionSourceIndex.current = index;
  };

  const onSectionDrop = (dropIndex: number) => {
    if (dragSectionSourceIndex.current === null) return;
    const dragIndex = dragSectionSourceIndex.current;
    if (dragIndex === dropIndex) return;

    const newSections = [...sections];
    const [draggedItem] = newSections.splice(dragIndex, 1);
    newSections.splice(dropIndex, 0, draggedItem);
    
    setSections(newSections);
    dragSectionSourceIndex.current = null;
  };

  // Menu DnD
  const onMenuDragStart = (index: number) => {
    dragMenuSourceIndex.current = index;
  };

  const onMenuDrop = (dropIndex: number) => {
    if (dragMenuSourceIndex.current === null) return;
    const dragIndex = dragMenuSourceIndex.current;
    if (dragIndex === dropIndex) return;

    const newItems = [...menuItems];
    const [draggedItem] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    
    setMenuItems(newItems);
    dragMenuSourceIndex.current = null;
  };

  // --- Section Management ---
  const toggleSection = (key: string, enabled: boolean) => {
    setSections(prev => prev.map(s => s.key === key ? { ...s, enabled } : s));
  };

  const addSection = () => {
    if (!newSectionLabel || !newSectionKey) {
      toast.error("Please provide both label and key");
      return;
    }
    setSections(prev => [...prev, { 
      key: newSectionKey, 
      label: newSectionLabel, 
      enabled: true, 
      settings: {} 
    }]);
    setNewSectionKey("");
    setNewSectionLabel("");
    toast.success("New section added");
  };

  // --- Menu Management ---
  const addMenuItem = () => {
    setMenuItems([...menuItems, { name: "New Link", href: "/" }]);
  };

  const removeMenuItem = (index: number) => {
    const newItems = [...menuItems];
    newItems.splice(index, 1);
    setMenuItems(newItems);
  };

  const updateMenuItem = (index: number, field: "name" | "href", value: string) => {
    const newItems = [...menuItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setMenuItems(newItems);
  };

  // --- Section Configuration Dialog ---
  const openSectionConfig = (section: SectionConfig) => {
    setEditingSection({ ...section, settings: section.settings || {} });
    setIsConfigOpen(true);
  };

  const saveSectionConfig = () => {
    if (editingSection) {
      setSections(prev => prev.map(s => s.key === editingSection.key ? editingSection : s));
      setIsConfigOpen(false);
      toast.success(`Settings for ${editingSection.label} saved`);
    }
  };

  const updateSectionSetting = (key: string, value: unknown) => {
    if (editingSection) {
      setEditingSection({
        ...editingSection,
        settings: { ...editingSection.settings, [key]: value }
      });
    }
  };

  const getSectionIcon = (key: string) => {
    switch(key) {
        case 'hero': return <Monitor className="h-3 w-3" />;
        case 'featured': return <Smartphone className="h-3 w-3" />;
        case 'brandSearch': return <Tag className="h-3 w-3" />;
        case 'hotDeals': return <Flame className="h-3 w-3" />;
        case 'mobileDeals': return <Smartphone className="h-3 w-3" />;
        case 'laptopDeals': return <Laptop className="h-3 w-3" />;
        case 'latestNews': return <Newspaper className="h-3 w-3" />;
        case 'recommended': return <TrendingUp className="h-3 w-3" />;
        case 'guides': return <BookOpen className="h-3 w-3" />;
        case 'comparison': return <Scale className="h-3 w-3" />;
        case 'poll': return <BarChart2 className="h-3 w-3" />;
        case 'chat': return <MessageSquare className="h-3 w-3" />;
        default: return <Layout className="h-3 w-3" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Theme & Frontend Editor</h1>
            <p className="text-muted-foreground">
              Customize your store's appearance and layout.
              {isThemeLoading ? " Loading saved theme configuration..." : ""}
            </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={applyRuntimeTheme} disabled={isThemeLoading || saveThemeMutation.isPending}>
                <Monitor className="mr-2 h-4 w-4" /> Apply Now
            </Button>
            <Button onClick={handleSaveConfig} disabled={isThemeLoading || saveThemeMutation.isPending}>
                <Save className="mr-2 h-4 w-4" /> {saveThemeMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
        </div>
      </div>

      <Tabs defaultValue="layout" className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-2 md:grid-cols-6 lg:w-[900px]">
          <TabsTrigger value="layout"><Layout className="mr-2 h-4 w-4" /> Layout</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="mr-2 h-4 w-4" /> Design</TabsTrigger>
          <TabsTrigger value="menu"><Type className="mr-2 h-4 w-4" /> Menu</TabsTrigger>
          <TabsTrigger value="news"><Newspaper className="mr-2 h-4 w-4" /> News</TabsTrigger>
          <TabsTrigger value="footer"><Layout className="mr-2 h-4 w-4" /> Footer</TabsTrigger>
          <TabsTrigger value="advanced"><Settings className="mr-2 h-4 w-4" /> Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="space-y-6 mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                        <CardTitle>Homepage Sections</CardTitle>
                        <CardDescription>Drag and drop to reorder sections. Toggle visibility or configure specific settings.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                        {sections.map((s, i) => (
                            <div
                            key={s.key}
                            className={`flex items-center gap-3 border rounded-lg p-3 bg-card transition-all ${!s.enabled ? 'opacity-60 bg-muted/50' : 'hover:shadow-sm'}`}
                            draggable
                            onDragStart={() => onSectionDragStart(i)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => onSectionDrop(i)}
                            >
                            <div className="cursor-grab p-1 text-muted-foreground hover:text-foreground">
                                <GripVertical className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <div className="font-medium flex items-center gap-2">
                                    {s.label}
                                    <span className="text-muted-foreground">{getSectionIcon(s.key)}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">ID: {s.key}</div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openSectionConfig(s)} title="Configure">
                                    <Settings className="h-4 w-4" />
                                </Button>
                                <Separator orientation="vertical" className="h-6" />
                                <Switch checked={s.enabled} onCheckedChange={(v) => toggleSection(s.key, v)} />
                            </div>
                            </div>
                        ))}
                        
                        <div className="mt-6 pt-6 border-t">
                            <h4 className="text-sm font-medium mb-3">Add Custom Section</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <Input
                                        placeholder="Label (e.g. New Banner)"
                                        value={newSectionLabel}
                                        onChange={(e) => setNewSectionLabel(e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Input
                                        placeholder="Key (e.g. new-banner)"
                                        value={newSectionKey}
                                        onChange={(e) => setNewSectionKey(e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                                <div>
                                    <Button className="w-full h-9" onClick={addSection} variant="secondary">
                                        <Plus className="mr-2 h-4 w-4" /> Add
                                    </Button>
                                </div>
                            </div>
                        </div>
                        </CardContent>
                    </Card>
                </div>
                
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                            <CardDescription>Live layout structure.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md bg-background overflow-hidden flex flex-col min-h-[400px] scale-95 origin-top shadow-inner">
                                <div className="h-12 border-b bg-muted/20 flex items-center px-4 gap-2">
                                    <div className="h-2 w-2 rounded-full bg-red-400"></div>
                                    <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                                    <div className="h-2 w-2 rounded-full bg-green-400"></div>
                                    <div className="ml-4 h-4 w-32 bg-muted rounded"></div>
                                </div>
                                <div className="flex-1 bg-secondary/5 p-4 space-y-2 overflow-y-auto max-h-[500px]">
                                    {sections.filter(s => s.enabled).map(s => (
                                        <div key={s.key} className="border rounded bg-card p-3 shadow-sm flex items-center justify-center flex-col gap-1 min-h-[60px]">
                                            <span className="text-xs font-bold text-primary">{s.label}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.key}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Theme & Colors</CardTitle>
                        <CardDescription>Global color palette and theme mode.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Mode</Label>
                            <div className="flex items-center gap-4">
                                <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")} className="flex-1"><Sun className="mr-2 h-4 w-4" /> Light</Button>
                                <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")} className="flex-1"><Moon className="mr-2 h-4 w-4" /> Dark</Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Primary Color</Label>
                            <div className="flex gap-2">
                                <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-16 p-1 cursor-pointer" />
                                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Secondary Color</Label>
                            <div className="flex gap-2">
                                <Input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-10 w-16 p-1 cursor-pointer" />
                                <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Typography & Shape</CardTitle>
                        <CardDescription>Fonts, radius, and layout width.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="space-y-2">
                            <Label>Font Family</Label>
                            <Select value={fontFamily} onValueChange={setFontFamily}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Inter, system-ui, sans-serif">Inter (Default)</SelectItem>
                                    <SelectItem value="Outfit, sans-serif">Outfit</SelectItem>
                                    <SelectItem value="serif">Serif</SelectItem>
                                    <SelectItem value="monospace">Monospace</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Border Radius ({radius}px)</Label>
                            <input type="range" min={0} max={24} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full accent-primary" />
                        </div>
                        <div className="space-y-2">
                            <Label>Container Width ({containerMaxWidth}px)</Label>
                            <input type="range" min={800} max={1600} step={10} value={containerMaxWidth} onChange={(e) => setContainerMaxWidth(Number(e.target.value))} className="w-full accent-primary" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6 mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Navigation Menu</CardTitle>
                    <CardDescription>Configure the main header navigation links. Drag to reorder.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {menuItems.map((m, i) => (
                        <div 
                            key={i} 
                            className="flex gap-2 items-center bg-card border p-2 rounded-md" 
                            draggable 
                            onDragStart={() => onMenuDragStart(i)} 
                            onDrop={() => onMenuDrop(i)} 
                            onDragOver={e => e.preventDefault()}
                        >
                            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                            <Input value={m.name} onChange={(e) => updateMenuItem(i, "name", e.target.value)} className="w-1/3" placeholder="Label" />
                            <Input value={m.href} onChange={(e) => updateMenuItem(i, "href", e.target.value)} className="flex-1" placeholder="URL path" />
                            <Button variant="ghost" size="icon" onClick={() => removeMenuItem(i)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
                    <Button variant="outline" onClick={addMenuItem} className="w-full mt-2"><Plus className="mr-2 h-4 w-4" /> Add Menu Item</Button>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="news" className="space-y-6 mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>News Page Configuration</CardTitle>
                    <CardDescription>Customize the appearance and features of the News section.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>News Hashtags</Label>
                        <Input value={newsHashtags} onChange={(e) => setNewsHashtags(e.target.value)} placeholder="#NepalTech,#GadgetLaunches" />
                        <p className="text-xs text-muted-foreground">Comma-separated hashtags displayed in the header.</p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Articles Per Page</Label>
                            <Input 
                                type="number" 
                                min={4} 
                                max={50} 
                                value={newsItemsPerPage} 
                                onChange={(e) => setNewsItemsPerPage(parseInt(e.target.value) || 16)} 
                            />
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border p-3 rounded-lg">
                                <div className="space-y-0.5">
                                    <Label>Popular Products Sidebar</Label>
                                    <div className="text-xs text-muted-foreground">Show trending products alongside news.</div>
                                </div>
                                <Switch checked={showPopularProducts} onCheckedChange={setShowPopularProducts} />
                            </div>
                            
                            <div className="flex items-center justify-between border p-3 rounded-lg">
                                <div className="space-y-0.5">
                                    <Label>Featured News Section</Label>
                                    <div className="text-xs text-muted-foreground">Highlight first and last related news.</div>
                                </div>
                                <Switch checked={showFeaturedNews} onCheckedChange={setShowFeaturedNews} />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="footer" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Footer Information</CardTitle>
                        <CardDescription>Main content and newsletter settings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Show Newsletter</Label>
                            <Switch checked={footerSettings.showNewsletter} onCheckedChange={(v) => setFooterSettings({...footerSettings, showNewsletter: v})} />
                        </div>
                        <div className="space-y-2">
                            <Label>About Text</Label>
                            <Textarea 
                                value={footerSettings.description} 
                                onChange={(e) => setFooterSettings({...footerSettings, description: e.target.value})} 
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Copyright Text</Label>
                            <Input 
                                value={footerSettings.copyrightText} 
                                onChange={(e) => setFooterSettings({...footerSettings, copyrightText: e.target.value})} 
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Social Media</CardTitle>
                        <CardDescription>Social links and visibility.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Show Social Icons</Label>
                            <Switch checked={footerSettings.showSocialIcons} onCheckedChange={(v) => setFooterSettings({...footerSettings, showSocialIcons: v})} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Facebook className="w-4 h-4" />
                                <Input placeholder="Facebook URL" value={footerSettings.socialLinks.facebook} onChange={(e) => setFooterSettings({...footerSettings, socialLinks: {...footerSettings.socialLinks, facebook: e.target.value}})} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Twitter className="w-4 h-4" />
                                <Input placeholder="Twitter URL" value={footerSettings.socialLinks.twitter} onChange={(e) => setFooterSettings({...footerSettings, socialLinks: {...footerSettings.socialLinks, twitter: e.target.value}})} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Instagram className="w-4 h-4" />
                                <Input placeholder="Instagram URL" value={footerSettings.socialLinks.instagram} onChange={(e) => setFooterSettings({...footerSettings, socialLinks: {...footerSettings.socialLinks, instagram: e.target.value}})} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Youtube className="w-4 h-4" />
                                <Input placeholder="YouTube URL" value={footerSettings.socialLinks.youtube} onChange={(e) => setFooterSettings({...footerSettings, socialLinks: {...footerSettings.socialLinks, youtube: e.target.value}})} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Linkedin className="w-4 h-4" />
                                <Input placeholder="LinkedIn URL" value={footerSettings.socialLinks.linkedin} onChange={(e) => setFooterSettings({...footerSettings, socialLinks: {...footerSettings.socialLinks, linkedin: e.target.value}})} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6 mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>System Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="flex items-center justify-between border p-4 rounded-lg">
                        <div className="space-y-0.5">
                            <Label>Frontend Live Editor</Label>
                            <div className="text-sm text-muted-foreground">Enable inline editing tools on the frontend (Admins only).</div>
                        </div>
                        <Switch checked={enableLiveEditor} onCheckedChange={setEnableLiveEditor} />
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* Section Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Configure {editingSection?.label}</DialogTitle>
                <DialogDescription>
                    Adjust specific settings for this section.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
	                {editingSection && (
	                     <>
	                        <div className="space-y-2">
	                            <Label>Section Title</Label>
	                            <Input 
	                                value={String((editingSection.settings as any)?.title ?? editingSection.label)} 
	                                onChange={(e) => updateSectionSetting("title", e.target.value)} 
	                            />
	                        </div>

                        {/* Hero Settings */}
                        {editingSection.key === 'hero' && (
                            <>
	                                <div className="flex items-center justify-between">
	                                    <Label>Autoplay</Label>
	                                    <Switch 
	                                        checked={typeof (editingSection.settings as any)?.autoplay === "boolean" ? (editingSection.settings as any).autoplay : true} 
	                                        onCheckedChange={(v) => updateSectionSetting("autoplay", v)} 
	                                    />
	                                </div>
	                                <div className="space-y-2">
	                                    <Label>Interval (ms)</Label>
	                                    <Input 
	                                        type="number" 
	                                        value={typeof (editingSection.settings as any)?.interval === "number" ? (editingSection.settings as any).interval : 5000} 
	                                        onChange={(e) => updateSectionSetting("interval", parseInt(e.target.value))} 
	                                    />
	                                </div>
	                                <div className="flex items-center justify-between">
	                                    <Label>Show Trending Sidebar</Label>
	                                    <Switch 
	                                        checked={typeof (editingSection.settings as any)?.showTrending === "boolean" ? (editingSection.settings as any).showTrending : true} 
	                                        onCheckedChange={(v) => updateSectionSetting("showTrending", v)} 
	                                    />
	                                </div>
                            </>
                        )}

                        {/* Brand Search Settings */}
                        {editingSection.key === 'brandSearch' && (
                             <>
	                                <div className="flex items-center justify-between">
	                                    <Label>Show Brand Logos</Label>
	                                    <Switch 
	                                        checked={typeof (editingSection.settings as any)?.showLogos === "boolean" ? (editingSection.settings as any).showLogos : true} 
	                                        onCheckedChange={(v) => updateSectionSetting("showLogos", v)} 
	                                    />
	                                </div>
                             </>
                        )}

                        {/* Latest News Settings */}
                        {editingSection.key === 'latestNews' && (
                             <>
	                                <div className="flex items-center justify-between">
	                                    <Label>Show Subtitle</Label>
	                                    <Switch 
	                                        checked={typeof (editingSection.settings as any)?.showSubtitle === "boolean" ? (editingSection.settings as any).showSubtitle : true} 
	                                        onCheckedChange={(v) => updateSectionSetting("showSubtitle", v)} 
	                                    />
	                                </div>
                                <Separator className="my-4" />
                                <div className="space-y-4">
                                    <h4 className="font-medium text-sm">Deal Countdown Offer</h4>
	                                    <div className="space-y-2">
	                                        <Label>Deal Title</Label>
	                                        <Input 
	                                            value={String((editingSection.settings as any)?.dealTitle ?? "")} 
	                                            onChange={(e) => updateSectionSetting("dealTitle", e.target.value)}
	                                            placeholder="e.g. Flash Sale" 
	                                        />
	                                    </div>
	                                    <div className="space-y-2">
	                                        <Label>Deal Description</Label>
	                                        <Input 
	                                            value={String((editingSection.settings as any)?.dealDescription ?? "")} 
	                                            onChange={(e) => updateSectionSetting("dealDescription", e.target.value)}
	                                            placeholder="e.g. 50% Off on all accessories" 
	                                        />
	                                    </div>
	                                    <div className="space-y-2">
	                                        <Label>Expiry Date</Label>
	                                        <Input 
	                                            type="datetime-local"
	                                            value={String((editingSection.settings as any)?.dealExpiry ?? "")} 
	                                            onChange={(e) => updateSectionSetting("dealExpiry", e.target.value)}
	                                        />
	                                    </div>
	                                    <div className="space-y-2">
	                                        <Label>Button Link</Label>
	                                        <Input 
	                                            value={String((editingSection.settings as any)?.dealLink ?? "/buy")} 
	                                            onChange={(e) => updateSectionSetting("dealLink", e.target.value)}
	                                        />
	                                    </div>
                                </div>
                             </>
                        )}

                        {/* Generic Count/Rows for many sections */}
	                        {['featured', 'mobileDeals', 'laptopDeals', 'recommended', 'latestNews', 'guides', 'comparison'].includes(editingSection.key) && (
	                            <div className="space-y-2">
	                                <Label>Item Count / Limit</Label>
	                                <Input 
	                                    type="number" 
	                                    value={
	                                      typeof (editingSection.settings as any)?.count === "number"
	                                        ? (editingSection.settings as any).count
	                                        : typeof (editingSection.settings as any)?.rows === "number"
	                                          ? (editingSection.settings as any).rows
	                                          : 4
	                                    } 
	                                    onChange={(e) => {
	                                        const val = parseInt(e.target.value);
	                                        if (typeof (editingSection.settings as any)?.rows === "number") updateSectionSetting("rows", val);
	                                        else updateSectionSetting("count", val);
	                                    }} 
	                                />
	                            </div>
	                        )}

                        {/* Chat Widget Settings */}
	                        {editingSection.key === 'chat' && (
	                            <div className="space-y-2">
	                                <Label>Position</Label>
	                                <Select 
	                                    value={
	                                      (editingSection.settings as any)?.position === "bottom-left" ||
	                                      (editingSection.settings as any)?.position === "bottom-right"
	                                        ? (editingSection.settings as any).position
	                                        : "bottom-right"
	                                    } 
	                                    onValueChange={(v) => updateSectionSetting("position", v)}
	                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfigOpen(false)}>Cancel</Button>
                <Button onClick={saveSectionConfig}>Save Settings</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
