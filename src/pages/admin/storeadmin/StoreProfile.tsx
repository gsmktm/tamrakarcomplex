/**
 * Store Admin - Profile Page
 * 
 * Allows store owners to update their store profile
 * Features shown/locked based on package entitlements
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getStoreEntitlements, getLockedFeatureMessage, resolveEffectiveStorePackage, shouldShowFeatureInAdmin } from "@/lib/storeEntitlements";
import type { Store, StoreUpdateInput } from "@/types/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  ArrowLeft,
  Lock,
  Loader2,
  MapPin,
  Store as StoreIcon,
  Phone,
  Mail,
  Share2,
  Image,
  Settings,
  DollarSign,
  Users,
  Package,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function StoreAdminProfile() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<StoreUpdateInput>({});

  // Fetch store details
  const { data: store, isLoading: isStoreLoading } = useQuery<Store>({
    queryKey: ["store", storeId],
    queryFn: async () => {
      if (!storeId) throw new Error("No store ID");

      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .eq("owner_id", user?.id)
        .single();

      if (error) throw error;
      return data as Store;
    },
    enabled: !!user && !!storeId,
  });

  const packageSlug = store ? resolveEffectiveStorePackage(store) : "free";
  const entitlements = getStoreEntitlements(packageSlug);

  // Handle field changes
  const handleChange = (field: keyof StoreUpdateInput, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Save changes
  const saveMutation = useMutation({
    mutationFn: async (data: StoreUpdateInput) => {
      if (!storeId) throw new Error("No store ID");

      const { error } = await supabase
        .from("stores")
        .update(data)
        .eq("id", storeId)
        .eq("owner_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Saved",
        description: "Your store profile has been updated.",
      });
      setFormData({});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to save changes",
        variant: "destructive",
      });
    },
  });

  if (isStoreLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Store Not Found</h1>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{store.name}</h1>
            <p className="text-muted-foreground">Manage your store profile</p>
          </div>
        </div>

        {/* Package Info Card */}
        <Card className="mb-8 border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {store.package_slug?.charAt(0).toUpperCase()}{store.package_slug?.slice(1)} Plan
                </CardTitle>
                <CardDescription>Features available in your plan</CardDescription>
              </div>
              <Badge variant="outline">{store.subscription_status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-semibold">{entitlements.productListingLimit}</p>
                <p className="text-muted-foreground text-xs">Product Limit</p>
              </div>
              <div>
                <p className="font-semibold">{entitlements.adminUserLimit}</p>
                <p className="text-muted-foreground text-xs">Admins Allowed</p>
              </div>
              <div>
                <p className="font-semibold">{entitlements.branchLimit}</p>
                <p className="text-muted-foreground text-xs">Branches</p>
              </div>
              <div>
                <p className="font-semibold">{entitlements.promoBannerSlots}</p>
                <p className="text-muted-foreground text-xs">Promo Slots</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Tabs */}
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Information */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StoreIcon className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-semibold">Store Name</label>
                    <Input
                      value={formData.name ?? store.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Your store name"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">Slug (URL)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">/stores/</span>
                      <Input
                        value={formData.slug ?? store.slug ?? ""}
                        onChange={(e) => handleChange("slug", e.target.value)}
                        placeholder="store-name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold">Shop Number</label>
                      <Input
                        value={formData.shop_no ?? store.shop_no ?? ""}
                        onChange={(e) => handleChange("shop_no", e.target.value)}
                        placeholder="e.g., 64"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold">Floor/Location</label>
                      <Input
                        value={formData.floor ?? store.floor ?? ""}
                        onChange={(e) => handleChange("floor", e.target.value)}
                        placeholder="e.g., 2nd Floor"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold">Description</label>
                    <textarea
                      className="w-full p-3 border rounded-lg"
                      rows={4}
                      value={formData.description ?? store.description ?? ""}
                      onChange={(e) => handleChange("description", e.target.value)}
                      placeholder="Describe your store..."
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">Address</label>
                    <Input
                      value={formData.address ?? store.address ?? ""}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="Detailed address"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Information */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Details
                </CardTitle>
                {!entitlements.canShowPhonePublic && (
                  <CardDescription className="flex items-center gap-2 text-amber-600 mt-2">
                    <AlertCircle className="h-4 w-4" />
                    Public phone display requires {store.package_slug === "free" ? "Silver+" : "higher"} plan
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className={cn(
                    "relative",
                    !entitlements.canShowPhonePublic && "opacity-60 pointer-events-none"
                  )}>
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone
                      {!entitlements.canShowPhonePublic && <Lock className="h-3 w-3 text-amber-600" />}
                    </label>
                    <Input
                      value={formData.phone ?? store.phone ?? ""}
                      onChange={(e) => !entitlements.canShowPhonePublic ? null : handleChange("phone", e.target.value)}
                      placeholder="+977 1 4..."
                      disabled={!entitlements.canShowPhonePublic}
                    />
                    {!entitlements.canShowPhonePublic && (
                      <p className="text-xs text-muted-foreground mt-1">{getLockedFeatureMessage(packageSlug, "phone")}</p>
                    )}
                  </div>

                  <div className={cn(
                    "relative",
                    !entitlements.canShowWhatsAppPublic && "opacity-60 pointer-events-none"
                  )}>
                    <label className="text-sm font-semibold flex items-center gap-2">
                      WhatsApp
                      {!entitlements.canShowWhatsAppPublic && <Lock className="h-3 w-3 text-amber-600" />}
                    </label>
                    <Input
                      value={formData.whatsapp ?? store.whatsapp ?? ""}
                      onChange={(e) => !entitlements.canShowWhatsAppPublic ? null : handleChange("whatsapp", e.target.value)}
                      placeholder="+977 98..."
                      disabled={!entitlements.canShowWhatsAppPublic}
                    />
                    {!entitlements.canShowWhatsAppPublic && (
                      <p className="text-xs text-muted-foreground mt-1">{getLockedFeatureMessage(packageSlug, "whatsapp")}</p>
                    )}
                  </div>

                  <div className={cn(
                    "relative",
                    !entitlements.canShowEmailPublic && "opacity-60 pointer-events-none"
                  )}>
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                      {!entitlements.canShowEmailPublic && <Lock className="h-3 w-3 text-amber-600" />}
                    </label>
                    <Input
                      type="email"
                      value={formData.email ?? store.email ?? ""}
                      onChange={(e) => !entitlements.canShowEmailPublic ? null : handleChange("email", e.target.value)}
                      placeholder="store@example.com"
                      disabled={!entitlements.canShowEmailPublic}
                    />
                    {!entitlements.canShowEmailPublic && (
                      <p className="text-xs text-muted-foreground mt-1">{getLockedFeatureMessage(packageSlug, "email")}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Share2 className="h-4 w-4" />
                      Website
                    </label>
                    <Input
                      value={formData.website ?? store.website ?? ""}
                      onChange={(e) => handleChange("website", e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media */}
          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Media & Branding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-semibold">Logo URL</label>
                    <Input
                      value={formData.logo_url ?? store.logo_url ?? ""}
                      onChange={(e) => handleChange("logo_url", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  <div className={cn(
                    "relative",
                    !entitlements.canCustomizeDesign && "opacity-60 pointer-events-none"
                  )}>
                    <label className="text-sm font-semibold flex items-center gap-2">
                      Cover Image URL
                      {!entitlements.canCustomizeDesign && <Lock className="h-3 w-3 text-amber-600" />}
                    </label>
                    <Input
                      value={formData.cover_image_url ?? store.cover_image_url ?? ""}
                      onChange={(e) => !entitlements.canCustomizeDesign ? null : handleChange("cover_image_url", e.target.value)}
                      placeholder="https://..."
                      disabled={!entitlements.canCustomizeDesign}
                    />
                    {!entitlements.canCustomizeDesign && (
                      <p className="text-xs text-muted-foreground mt-1">Available in Gold+ plans</p>
                    )}
                  </div>

                  <div className={cn(
                    "relative",
                    !entitlements.canCustomizeDesign && "opacity-60 pointer-events-none"
                  )}>
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Theme
                      {!entitlements.canCustomizeDesign && <Lock className="h-3 w-3 text-amber-600" />}
                    </label>
                    <select
                      className="w-full p-3 border rounded-lg"
                      value={formData.theme_slug ?? store.theme_slug ?? "default"}
                      onChange={(e) => !entitlements.canCustomizeDesign ? null : handleChange("theme_slug", e.target.value)}
                      disabled={!entitlements.canCustomizeDesign}
                    >
                      <option value="default">Default</option>
                      {entitlements.availableThemes.includes("premium") && <option value="premium">Premium</option>}
                      {entitlements.availableThemes.includes("modern") && <option value="modern">Modern</option>}
                      {entitlements.availableThemes.includes("luxury") && <option value="luxury">Luxury</option>}
                    </select>
                    {!entitlements.canCustomizeDesign && (
                      <p className="text-xs text-muted-foreground mt-1">Premium themes available in Gold+ plans</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Advanced Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {shouldShowFeatureInAdmin(packageSlug, "marketplace") && (
                  <div>
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Marketplace Commission
                    </label>
                    <Input
                      type="number"
                      value={formData.marketplace_commission ?? store.marketplace_commission ?? 10}
                      onChange={(e) => handleChange("marketplace_commission", parseFloat(e.target.value))}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Percentage taken from each sale</p>
                  </div>
                )}

                {shouldShowFeatureInAdmin(packageSlug, "team") && (
                  <div>
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Staff Access
                    </label>
                    <div className="text-sm text-muted-foreground">
                      Maximum {entitlements.staffMemberLimit} staff members in {store.package_slug} plan.
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-semibold">Status</label>
                  <select
                    className="w-full p-3 border rounded-lg"
                    value={formData.status ?? store.status ?? "active"}
                    onChange={(e) => handleChange("status", e.target.value as any)}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setFormData({})}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setIsSaving(true);
              saveMutation.mutate(formData, {
                onSettled: () => setIsSaving(false),
              });
            }}
            disabled={isSaving || Object.keys(formData).length === 0}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
