import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff, 
  Image as ImageIcon, 
  ExternalLink, 
  Loader2,
  Calendar,
  Layers,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";

type MarketingBanner = {
  id?: string;
  title: string;
  subtitle?: string | null;
  image_url: string;
  link_url?: string | null;
  button_text?: string | null;
  placement: string;
  is_active: boolean;
  sort_order: number;
  starts_at?: string | null;
  ends_at?: string | null;
};

export default function CampaignManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<MarketingBanner | null>(null);

  const { data: banners, isLoading, error: bannersError } = useQuery({
    queryKey: ["marketing-banners"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("marketing_banners")
          .select("*")
          .order("sort_order", { ascending: true });
        if (error) throw error;
        return data;
      } catch (err) {
        handleSupabaseError(err, "CampaignManager: Failed to fetch banners");
        return [];
      }
    },
    retry: 1,
  });

  const upsertBannerMutation = useMutation({
    mutationFn: async (banner: MarketingBanner | null) => {
      if (!banner) return;
      if (banner.id) {
        const { error } = await supabase.from("marketing_banners").update(banner).eq("id", banner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("marketing_banners").insert(banner);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-banners"] });
      toast.success(editingBanner ? "Banner updated" : "Banner created");
      setIsDialogOpen(false);
      setEditingBanner(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save banner");
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-banners"] });
      toast.success("Banner deleted");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("marketing_banners").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-banners"] });
      toast.success("Banner status updated");
    },
  });

  const handleEdit = (banner: MarketingBanner) => {
    setEditingBanner(banner);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingBanner({
      title: "",
      subtitle: "",
      image_url: "",
      link_url: "",
      button_text: "Shop Now",
      placement: "home_hero",
      is_active: true,
      sort_order: 0,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Manager</h1>
          <p className="text-muted-foreground">Manage homepage banners, ads, and platform-wide promotions.</p>
        </div>
        <Button onClick={handleAddNew} className="hero-gradient gap-2">
          <Plus className="h-4 w-4" /> Create New Campaign
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Active Banners & Placements
            </CardTitle>
            <CardDescription>
              Drag and drop to reorder banners within each placement zone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Title & Placement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners?.map((banner: MarketingBanner) => (
                  <TableRow key={banner.id} className="group">
                    <TableCell>
                      <div className="h-12 w-24 rounded-lg bg-muted overflow-hidden border border-border/50">
                        <img src={banner.image_url} alt="" className="h-full w-full object-cover" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">{banner.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                            {banner.placement}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">Order: {banner.sort_order}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={banner.is_active} 
                          onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: banner.id, is_active: checked })}
                        />
                        {banner.is_active ? (
                          <Badge className="bg-green-500/10 text-green-600 border-none flex items-center gap-1">
                            <Eye className="h-3 w-3" /> Live
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <EyeOff className="h-3 w-3" /> Hidden
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Starts: {format(new Date(banner.starts_at ?? new Date()), "MMM d")}
                        </div>
                        {banner.ends_at && (
                          <div className="flex items-center gap-1 text-orange-500 font-medium">
                            <Clock className="h-3 w-3" />
                            Ends: {format(new Date(banner.ends_at), "MMM d")}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(banner)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm(`Delete campaign "${banner.title}"?`)) deleteBannerMutation.mutate(banner.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {banners?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                      No banners found. Create your first campaign to boost sales!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingBanner?.id ? "Edit Campaign" : "New Campaign"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campaign Title</Label>
                <Input 
                  value={editingBanner?.title ?? ""} 
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  placeholder="e.g., iPhone 15 Mega Sale" 
                />
              </div>
              <div className="space-y-2">
                <Label>Placement Zone</Label>
                <Select 
                  value={editingBanner?.placement ?? "home_hero"} 
                  onValueChange={(val) => setEditingBanner({ ...editingBanner, placement: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select placement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home_hero">Home Hero Slider</SelectItem>
                    <SelectItem value="marketplace_top">Marketplace Header</SelectItem>
                    <SelectItem value="sidebar_ad">Sidebar Sidebar Ad</SelectItem>
                    <SelectItem value="category_top">Category Page Top</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subtitle / Description</Label>
              <Input 
                value={editingBanner?.subtitle ?? ""} 
                onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                placeholder="Brief description for the banner" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Image URL</Label>
                <div className="flex gap-2">
                  <Input 
                    value={editingBanner?.image_url ?? ""} 
                    onChange={(e) => setEditingBanner({ ...editingBanner, image_url: e.target.value })}
                    placeholder="https://..." 
                  />
                  <Button variant="outline" size="icon" className="shrink-0">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Link Destination</Label>
                <div className="flex gap-2">
                  <Input 
                    value={editingBanner?.link_url ?? ""} 
                    onChange={(e) => setEditingBanner({ ...editingBanner, link_url: e.target.value })}
                    placeholder="/product/..." 
                  />
                  <Button variant="outline" size="icon" className="shrink-0">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Button Text</Label>
                <Input 
                  value={editingBanner?.button_text ?? ""} 
                  onChange={(e) => setEditingBanner({ ...editingBanner, button_text: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input 
                  type="number" 
                  value={editingBanner?.sort_order ?? 0} 
                  onChange={(e) => setEditingBanner({ ...editingBanner, sort_order: parseInt(e.target.value) || 0 } as MarketingBanner)}
                />
              </div>
              <div className="space-y-2">
                <Label>Live Status</Label>
                <div className="flex items-center h-10 gap-2">
                  <Switch 
                    checked={editingBanner?.is_active ?? false} 
                    onCheckedChange={(val) => setEditingBanner({ ...editingBanner, is_active: val })}
                  />
                  <span className="text-sm font-medium">{editingBanner?.is_active ? "Active" : "Hidden"}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button className="hero-gradient" onClick={() => upsertBannerMutation.mutate(editingBanner)}>
              {upsertBannerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
