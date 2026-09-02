import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { APP_SETTINGS_COLUMNS, PROFILES_COLUMNS } from "@/lib/supabaseColumnMaps";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { toast } from "sonner";
import { Shield, Users, Store, User, Settings as SettingsIcon, Save, Database, Globe, Key, Loader2, Upload } from "lucide-react";
import UserManager from "./UserManager";
import { getErrorMessage } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";
import { buildAppSettingsRows, DEFAULT_APP_SETTINGS, mergeAppSettings, writeAppSettings } from "@/lib/siteSettings";
import type { AppSettings } from "@/types/app";

type AppSettingRow = {
  key: keyof AppSettings;
  value: Json;
};

const GeneralSettings = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  const { isLoading, refetch } = useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select(APP_SETTINGS_COLUMNS.join(","))
        .in("key", ["site_info", "contact_info", "features"]);
      
      if (error) {
        console.error("Error fetching settings:", error);
        throw error;
      }

      const rows = (data || []) as AppSettingRow[];
      const site_info = rows.find((r) => r.key === "site_info")?.value;
      const contact_info = rows.find((r) => r.key === "contact_info")?.value;
      const features = rows.find((r) => r.key === "features")?.value;
      
      const merged = mergeAppSettings({ site_info, contact_info, features });
      setSettings(merged);
      writeAppSettings(merged);
      return merged;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings: AppSettings) => {
      const updates = buildAppSettingsRows(newSettings);
      console.log("Saving settings updates:", updates);

      for (const update of updates) {
        const { error } = await supabase
          .from("app_settings")
          .upsert(update, { onConflict: "key" });
        
        if (error) {
          console.error(`Error updating setting ${update.key}:`, error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_settings"] });
      writeAppSettings(settings);
      toast.success("Settings updated successfully and applied locally");
      refetch();
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      console.error("Mutation error:", error);
      toast.error(`Failed to update settings: ${message}`);
    },
  });

  if (isLoading) return <div>Loading settings...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Site Information</CardTitle>
          <CardDescription>General information about your website.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="site_name">Site Name</Label>
            <Input 
              id="site_name" 
              value={settings.site_info.name} 
              onChange={(e) => setSettings({...settings, site_info: {...settings.site_info, name: e.target.value}})} 
            />
          </div>
          <div className="grid gap-2">
              <Label htmlFor="site_desc">Description</Label>
              <Textarea 
                id="site_desc" 
                value={settings.site_info.description} 
                onChange={(e) => setSettings({...settings, site_info: {...settings.site_info, description: e.target.value}})} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="site_favicon">Favicon URL</Label>
              <div className="flex gap-2">
                <Input 
                  id="site_favicon" 
                  value={settings.site_info.favicon_url || ""} 
                  placeholder="/favicon.ico or https://..."
                  onChange={(e) => setSettings({...settings, site_info: {...settings.site_info, favicon_url: e.target.value}})} 
                />
                {settings.site_info.favicon_url && (
                  <div className="h-10 w-10 border rounded flex items-center justify-center bg-background p-1 shrink-0">
                    <img src={settings.site_info.favicon_url} alt="Favicon" className="max-h-full max-w-full" />
                  </div>
                )}
              </div>
            </div>
          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <Label>Maintenance Mode</Label>
              <div className="text-sm text-muted-foreground">Disable public access to the site.</div>
            </div>
            <Switch 
              checked={settings.site_info.maintenance_mode} 
              onCheckedChange={(v) => setSettings({...settings, site_info: {...settings.site_info, maintenance_mode: v}})} 
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> Contact Information</CardTitle>
            <CardDescription>Public contact details displayed on the site.</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSettings({
                ...settings,
                contact_info: DEFAULT_APP_SETTINGS.contact_info
              });
              toast.info("Contact info reset to defaults (save to apply)");
            }}
          >
            Reset Defaults
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="contact_email">Email</Label>
              <Input 
                id="contact_email" 
                value={settings.contact_info.email} 
                onChange={(e) => setSettings({...settings, contact_info: {...settings.contact_info, email: e.target.value}})} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact_phone">Phone</Label>
              <Input 
                id="contact_phone" 
                value={settings.contact_info.phone} 
                onChange={(e) => setSettings({...settings, contact_info: {...settings.contact_info, phone: e.target.value}})} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact_whatsapp">WhatsApp Number</Label>
              <Input 
                id="contact_whatsapp" 
                value={settings.contact_info.whatsapp || ""} 
                placeholder="+977-XXXXXXXXXX"
                onChange={(e) => setSettings({...settings, contact_info: {...settings.contact_info, whatsapp: e.target.value}})} 
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="contact_address">Address</Label>
              <Input 
                id="contact_address" 
                value={settings.contact_info.address} 
                onChange={(e) => setSettings({...settings, contact_info: {...settings.contact_info, address: e.target.value}})} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Feature Toggles</CardTitle>
          <CardDescription>Enable or disable specific modules.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Blog/News</Label>
            <Switch 
              checked={settings.features.enable_blog} 
              onCheckedChange={(v) => setSettings({...settings, features: {...settings.features, enable_blog: v}})} 
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Enable Reviews</Label>
            <Switch 
              checked={settings.features.enable_reviews} 
              onCheckedChange={(v) => setSettings({...settings, features: {...settings.features, enable_reviews: v}})} 
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Enable Shop/Cart</Label>
            <Switch 
              checked={settings.features.enable_shop} 
              onCheckedChange={(v) => setSettings({...settings, features: {...settings.features, enable_shop: v}})} 
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Marketplace</Label>
              <p className="text-sm text-muted-foreground">Enable community buy/sell marketplace</p>
            </div>
            <Switch
              checked={settings.features?.enable_marketplace}
              onCheckedChange={(checked) =>
                setSettings({...settings, features: {...settings.features, enable_marketplace: checked}})
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Valuation Tool</Label>
              <p className="text-sm text-muted-foreground">Enable instant phone price estimator</p>
            </div>
            <Switch
              checked={settings.features?.enable_valuation}
              onCheckedChange={(checked) =>
                setSettings({...settings, features: {...settings.features, enable_valuation: checked}})
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Repair Services</Label>
              <p className="text-sm text-muted-foreground">Enable online repair requests</p>
            </div>
            <Switch
              checked={settings.features?.enable_repair}
              onCheckedChange={(checked) =>
                setSettings({...settings, features: {...settings.features, enable_repair: checked}})
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">AI Chatbot</Label>
              <p className="text-sm text-muted-foreground">Enable AI support chatbot</p>
            </div>
            <Switch
              checked={settings.features?.enable_chatbot}
              onCheckedChange={(checked) =>
                setSettings({...settings, features: {...settings.features, enable_chatbot: checked}})
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">News & Articles</Label>
              <p className="text-sm text-muted-foreground">Enable site-wide newsroom and blog</p>
            </div>
            <Switch
              checked={settings.features?.enable_news}
              onCheckedChange={(checked) =>
                setSettings({...settings, features: {...settings.features, enable_news: checked}})
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Service Desk</Label>
              <p className="text-sm text-muted-foreground">Enable customer support and ticketing</p>
            </div>
            <Switch
              checked={settings.features?.enable_service_desk}
              onCheckedChange={(checked) =>
                setSettings({...settings, features: {...settings.features, enable_service_desk: checked}})
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">WhatsApp Chat</Label>
              <p className="text-sm text-muted-foreground">Enable floating WhatsApp contact button</p>
            </div>
            <Switch
              checked={settings.features?.enable_whatsapp}
              onCheckedChange={(checked) =>
                setSettings({...settings, features: {...settings.features, enable_whatsapp: checked}})
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => updateMutation.mutate(settings)} disabled={updateMutation.isPending}>
          <Save className="mr-2 h-4 w-4" /> Save All Changes
        </Button>
      </div>
    </div>
  );
};

const SecuritySettings = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Password updated successfully");
            setPassword("");
            setConfirmPassword("");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Security Settings</CardTitle>
                <CardDescription>Manage your password and security preferences.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            placeholder="Enter new password"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Confirm Password</Label>
                        <Input 
                            type="password" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            placeholder="Confirm new password"
                        />
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Change Password
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

const ProfileSettings = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
      display_name: "",
      bio: "",
      avatar_url: ""
  });
  
  const { data: profile, isLoading } = useQuery({
    queryKey: ["my_profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("profiles")
        .select(PROFILES_COLUMNS.join(","))
        .eq("id", user.id)
        .single();
      return data;
    },
  });

  useEffect(() => {
      if (profile) {
          setFormData({
              display_name: profile.display_name || "",
              bio: profile.bio || "",
              avatar_url: profile.avatar_url || ""
          });
      }
  }, [profile]);

  const updateProfileMutation = useMutation({
      mutationFn: async (data: typeof formData) => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Not logged in");

          const { error } = await supabase
              .from("profiles")
              .update(data)
              .eq("id", user.id);
          
          if (error) throw error;
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["my_profile"] });
          toast.success("Profile updated successfully");
      },
      onError: (err: unknown) => {
          toast.error(getErrorMessage(err));
      }
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to 'avatars' bucket (assuming it exists, or handling error)
      const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file);

      if (uploadError) {
          toast.error("Failed to upload image. Ensure 'avatars' bucket exists.");
          return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (!data?.publicUrl) {
          toast.error("Could not retrieve uploaded image URL. Please try again.");
          return;
      }
      setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));
  };

  if (isLoading) return <div>Loading profile...</div>;
  if (!profile) return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <User className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">Please Log In</h3>
          <p className="text-muted-foreground">You need to be logged in to view and edit your profile settings.</p>
          <Button asChild>
              <Link to="/auth">Go to Login</Link>
          </Button>
      </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> My Profile</CardTitle>
        <CardDescription>Manage your personal information and public profile.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
            <div className="relative group">
                {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-border" />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold border-2 border-border">
                        {formData.display_name?.[0]?.toUpperCase() || "U"}
                    </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
                    <Upload className="h-6 w-6" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                </label>
            </div>
            <div>
                <h3 className="font-medium text-lg">{formData.display_name || "User"}</h3>
                <p className="text-sm text-muted-foreground">Click image to update avatar</p>
            </div>
        </div>

        <div className="grid gap-4 max-w-md">
            <div className="grid gap-2">
                <Label>Display Name</Label>
                <Input 
                    value={formData.display_name} 
                    onChange={(e) => setFormData({...formData, display_name: e.target.value})} 
                />
            </div>
            <div className="grid gap-2">
                <Label>Bio</Label>
                <Textarea 
                    value={formData.bio} 
                    onChange={(e) => setFormData({...formData, bio: e.target.value})} 
                    rows={4}
                />
            </div>
            <Button 
                onClick={() => updateProfileMutation.mutate(formData)} 
                disabled={updateProfileMutation.isPending}
            >
                {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Profile
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Settings() {
  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Manage global configurations, users, and permissions.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[650px]">
          <TabsTrigger value="general"><SettingsIcon className="mr-2 h-4 w-4" /> General</TabsTrigger>
          <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="security"><Shield className="mr-2 h-4 w-4" /> Security</TabsTrigger>
          <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" /> Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManager />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings />
        </TabsContent>

      </Tabs>
    </div>
  );
}
