import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STORE_MEDIA_COLUMNS } from "@/lib/supabaseColumnMaps";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/common/ImageUploader";
import { Loader2, Save, Image as ImageIcon, Trash2, Layout } from "lucide-react";
import { toast } from "sonner";

export default function StoreMediaManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["my-store-media", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, logo_url, banner_url, package_id")
        .or(`owner_user_id.eq.${user?.id},owner_id.eq.${user?.id}`)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: gallery, isLoading: galleryLoading } = useQuery({
    queryKey: ["store-gallery", store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_media")
        .select(STORE_MEDIA_COLUMNS.join(","))
        .eq("store_id", store?.id)
        .eq("media_type", "gallery")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  const updateStoreMutation = useMutation({
    mutationFn: async (updates: { logo_url?: string; banner_url?: string }) => {
      const { error } = await supabase.from("stores").update(updates).eq("id", store?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-store-media"] });
      toast.success("Store branding updated");
    },
  });

  const addToGalleryMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const newMedia = urls.map((url) => ({
        store_id: store?.id,
        media_type: "gallery",
        url: url,
      }));
      const { error } = await supabase.from("store_media").insert(newMedia);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-gallery"] });
      toast.success("Gallery updated");
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_media").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-gallery"] });
      toast.success("Image removed from gallery");
    },
  });

  if (storeLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Media & Branding</h1>
        <p className="text-muted-foreground">Manage your store's visual identity, logo, and gallery.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Logo Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" /> Store Logo
            </CardTitle>
            <CardDescription>Upload your store's profile logo. Square ratio recommended.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              {store?.logo_url ? (
                <div className="relative h-32 w-32 rounded-full overflow-hidden border-2 border-primary/20">
                  <img src={store.logo_url} alt="Logo" className="h-full w-full object-cover" />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 rounded-full"
                    onClick={() => updateStoreMutation.mutate({ logo_url: "" })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center border-2 border-dashed">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
              <ImageUploader 
                value={[]} 
                onChange={(urls) => updateStoreMutation.mutate({ logo_url: urls[0] })} 
                folder={`stores/${store?.id}/branding`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Banner Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5" /> Store Banner
            </CardTitle>
            <CardDescription>Upload a banner for your store profile page. Wide ratio recommended.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              {store?.banner_url ? (
                <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden border">
                  <img src={store.banner_url} alt="Banner" className="h-full w-full object-cover" />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => updateStoreMutation.mutate({ banner_url: "" })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="w-full aspect-[3/1] rounded-lg bg-muted flex items-center justify-center border-2 border-dashed">
                  <Layout className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
              <ImageUploader 
                value={[]} 
                onChange={(urls) => updateStoreMutation.mutate({ banner_url: urls[0] })} 
                folder={`stores/${store?.id}/branding`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gallery Section */}
      <Card>
        <CardHeader>
          <CardTitle>Store Gallery</CardTitle>
          <CardDescription>Showcase your shop interior, staff, or special displays to customers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {gallery?.map((item) => (
              <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border group">
                <img src={item.url} alt="Gallery" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => deleteMediaMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-4 text-center">
              <ImageUploader 
                value={[]} 
                onChange={(urls) => addToGalleryMutation.mutate(urls)} 
                folder={`stores/${store?.id}/gallery`}
              />
              <span className="text-xs text-muted-foreground mt-2">Add to Gallery</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
