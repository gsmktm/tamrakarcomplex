import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Trash2, Search, ExternalLink, Eye, MapPin, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { ImageUploader } from "@/components/common/ImageUploader";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { SellListingRow } from "@/types/app";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { decodeListingDescription, encodeListingDescription, formatCondition, toCoarseLocation } from "@/lib/listingMeta";

interface ListingFormValues {
  title: string;
  price: number;
  listing_type: string;
  status: string;
  category: string;
  condition: string;
  brand: string;
  model: string;
  location: string;
  contact_info: string;
  description: string;
  images?: string[];
  subcategory: string;
  item_details: string;
  available_date: string;
  hide_precise_location: boolean;
  location_radius_km: number;
  delivery_meetup: boolean;
  delivery_home_delivery: boolean;
  delivery_courier: boolean;
  delivery_notes: string;
  specs_storage: string;
  specs_ram: string;
  specs_color: string;
  specs_battery: string;
  specs_cpu: string;
  specs_gpu: string;
  specs_screen: string;
}

const ListingManager = () => {
  const { user, role } = useAuth();
  const isPlatformAdmin = role === "suadmin" || role === "staffadmin";
  const [search, setSearch] = useState("");
  const [editingListing, setEditingListing] = useState<SellListingRow | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm<ListingFormValues>();
  const watchedHidePrecise = watch("hide_precise_location");
  const watchedMeetup = watch("delivery_meetup");
  const watchedHomeDelivery = watch("delivery_home_delivery");
  const watchedCourier = watch("delivery_courier");
  const watchedCategory = watch("category");
  const watchedCondition = watch("condition");
  const watchedStatus = watch("status");
  const watchedType = watch("listing_type");

  const { data: listings, isLoading } = useQuery({
    queryKey: ["admin_listings", role, user?.id],
    queryFn: async () => {
      let query = supabase.from("sell_listings").select("*");
      
      if (!isPlatformAdmin && user?.id) {
        query = query.eq("user_id", user.id);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sell_listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_listings"] });
      toast.success("Listing deleted successfully");
    },
    onError: (error: unknown) => {
      toast.error(`Error deleting listing: ${getErrorMessage(error)}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: ListingFormValues) => {
      if (!editingListing) throw new Error("No listing selected for update");
      const specs: Record<string, string> = {};
      if (values.specs_storage?.trim()) specs.Storage = values.specs_storage.trim();
      if (values.specs_ram?.trim()) specs.RAM = values.specs_ram.trim();
      if (values.specs_color?.trim()) specs.Color = values.specs_color.trim();
      if (values.specs_battery?.trim()) specs["Battery / Health"] = values.specs_battery.trim();
      if (values.specs_cpu?.trim()) specs.Processor = values.specs_cpu.trim();
      if (values.specs_gpu?.trim()) specs.Graphics = values.specs_gpu.trim();
      if (values.specs_screen?.trim()) specs.Screen = values.specs_screen.trim();

      const availableDateIso = values.available_date ? new Date(values.available_date).toISOString() : undefined;
      const meta = {
        subcategory: values.subcategory?.trim() || undefined,
        item_details: values.item_details?.trim() || undefined,
        available_date: availableDateIso,
        hide_precise_location: Boolean(values.hide_precise_location),
        location_radius_km: Number.isFinite(values.location_radius_km) ? Number(values.location_radius_km) : undefined,
        delivery: {
          meetup: Boolean(values.delivery_meetup),
          home_delivery: Boolean(values.delivery_home_delivery),
          courier: Boolean(values.delivery_courier),
          notes: values.delivery_notes?.trim() || undefined,
        },
        specs: Object.keys(specs).length ? specs : undefined,
      };

      const descriptionWithMeta = encodeListingDescription(values.description, meta);
      const safeLocation = values.hide_precise_location ? toCoarseLocation(values.location) : values.location;

      const { error } = await supabase
        .from("sell_listings")
        .update({
          title: values.title,
          price: values.price,
          listing_type: values.listing_type,
          status: values.status,
          category: values.category,
          condition: values.condition,
          brand: values.brand || null,
          model: values.model || null,
          location: safeLocation || null,
          contact_info: values.contact_info || null,
          description: descriptionWithMeta || null,
          images: uploadedImages,
        })
        .eq("id", editingListing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_listings"] });
      setIsEditOpen(false);
      setEditingListing(null);
      toast.success("Listing updated successfully");
    },
    onError: (error: unknown) => {
      toast.error(`Error updating listing: ${getErrorMessage(error)}`);
    },
  });

  const handleEdit = (listing: SellListingRow) => {
    setEditingListing(listing);
    const decoded = decodeListingDescription(listing.description);
    const meta = decoded.meta;
    const specs = meta?.specs ?? {};
    reset({
      title: listing.title,
      price: listing.price,
      listing_type: listing.listing_type || "sell",
      status: listing.status || "active",
      category: listing.category,
      condition: listing.condition || "used",
      brand: listing.brand || "",
      model: listing.model || "",
      location: listing.location || "",
      contact_info: listing.contact_info || "",
      description: decoded.text || "",
      subcategory: meta?.subcategory || "",
      item_details: meta?.item_details || "",
      available_date: meta?.available_date ? meta.available_date.slice(0, 10) : "",
      hide_precise_location: Boolean(meta?.hide_precise_location),
      location_radius_km: typeof meta?.location_radius_km === "number" ? meta.location_radius_km : 3,
      delivery_meetup: Boolean(meta?.delivery?.meetup ?? true),
      delivery_home_delivery: Boolean(meta?.delivery?.home_delivery ?? false),
      delivery_courier: Boolean(meta?.delivery?.courier ?? false),
      delivery_notes: meta?.delivery?.notes || "",
      specs_storage: specs.Storage || "",
      specs_ram: specs.RAM || "",
      specs_color: specs.Color || "",
      specs_battery: specs["Battery / Health"] || "",
      specs_cpu: specs.Processor || "",
      specs_gpu: specs.Graphics || "",
      specs_screen: specs.Screen || "",
    });
    setUploadedImages(listing.images || []);
    setIsEditOpen(true);
  };

  const onSubmit = (values: ListingFormValues) => {
    updateMutation.mutate(values);
  };

  const filteredListings = listings?.filter((listing) =>
    listing.title.toLowerCase().includes(search.toLowerCase()) ||
    listing.category.toLowerCase().includes(search.toLowerCase()) ||
    (listing.listing_type && listing.listing_type.toLowerCase().includes(search.toLowerCase())) ||
    (listing.brand && listing.brand.toLowerCase().includes(search.toLowerCase())) ||
    (listing.model && listing.model.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Marketplace Listings</h1>
        {!isPlatformAdmin && (
          <Button asChild>
            <Link to="/marketplace/sell">Post New Listing</Link>
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search listings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Brand/Model</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredListings?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center h-24">
                  No listings found.
                </TableCell>
              </TableRow>
            ) : (
              filteredListings?.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell>
                    <Badge variant="outline" className={
                      listing.listing_type === 'buy' ? 'bg-blue-100 text-blue-800' :
                      listing.listing_type === 'exchange' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {listing.listing_type || 'sell'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate" title={listing.title}>
                    {listing.title}
                  </TableCell>
                  <TableCell>Rs. {listing.price.toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{listing.category}</TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{listing.brand || "-"}</div>
                    <div className="text-xs text-muted-foreground">{listing.model || ""}</div>
                  </TableCell>
                  <TableCell className="capitalize">{formatCondition(listing.condition)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {listing.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={listing.status === "active" ? "default" : "secondary"}>
                      {listing.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(listing.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(listing)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Link to={`/marketplace/listing/${listing.id}`} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this listing?")) {
                          deleteMutation.mutate(listing.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                onValueChange={(val) => setValue("category", val)}
                value={watchedCategory || "mobile"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile">Mobile Phones</SelectItem>
                  <SelectItem value="laptop">Laptops / MacBook</SelectItem>
                  <SelectItem value="tablet">Tablets / iPad</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="watch">Smartwatches</SelectItem>
                  <SelectItem value="gaming">Gaming</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                  <SelectItem value="other">Electronics, TVs, & More</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input {...register("title", { required: true })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Price</Label>
                <Input type="number" {...register("price", { required: true, valueAsNumber: true })} />
              </div>
              <div className="grid gap-2">
                <Label>Condition</Label>
                <Select onValueChange={(val) => setValue("condition", val)} value={watchedCondition || "used"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="like_new">Like New</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Brand</Label>
                <Input {...register("brand")} placeholder="Apple, Samsung..." />
              </div>
              <div className="grid gap-2">
                <Label>Model</Label>
                <Input {...register("model")} placeholder="iPhone 13 Pro..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Location</Label>
                <Input {...register("location")} placeholder="Kathmandu..." />
              </div>
              <div className="grid gap-2">
                <Label>Contact Info</Label>
                <Input {...register("contact_info")} placeholder="98XXXXXXXX" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Public Description</Label>
              <Textarea {...register("description")} className="min-h-[90px]" />
            </div>
            <div className="grid gap-2">
              <Label>Images</Label>
              <ImageUploader
                value={uploadedImages}
                onChange={(urls) => {
                  setUploadedImages(urls);
                }}
                folder={`marketplace/${editingListing?.user_id || "admin"}`}
              />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select 
                onValueChange={(val) => setValue("listing_type", val)} 
                value={watchedType || "sell"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="exchange">Exchange</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select 
                onValueChange={(val) => setValue("status", val)} 
                value={watchedStatus || "active"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced">
                <AccordionTrigger>Advanced Fields</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Subcategory</Label>
                      <Input {...register("subcategory")} placeholder="Camera, MacBook..." />
                    </div>
                    <div className="grid gap-2">
                      <Label>Pick a date</Label>
                      <Input type="date" {...register("available_date")} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Item Details (max 500 chars)</Label>
                    <Textarea {...register("item_details")} className="min-h-[90px]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border p-3 flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">Hide precise location</div>
                        <div className="text-xs text-muted-foreground">Only show city-level location</div>
                      </div>
                      <Switch checked={Boolean(watchedHidePrecise)} onCheckedChange={(v) => setValue("hide_precise_location", v)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Location Radius (km)</Label>
                      <Input type="number" {...register("location_radius_km", { valueAsNumber: true })} />
                    </div>
                  </div>
                  <div className="rounded-xl border p-3 space-y-3">
                    <div className="font-medium">Delivery</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={Boolean(watchedMeetup)} onCheckedChange={(v) => setValue("delivery_meetup", Boolean(v))} />
                        <span className="text-sm">Meetup</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={Boolean(watchedHomeDelivery)} onCheckedChange={(v) => setValue("delivery_home_delivery", Boolean(v))} />
                        <span className="text-sm">Home</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={Boolean(watchedCourier)} onCheckedChange={(v) => setValue("delivery_courier", Boolean(v))} />
                        <span className="text-sm">Courier</span>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Delivery Notes</Label>
                      <Input {...register("delivery_notes")} placeholder="Fee/time/area..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Storage</Label>
                      <Input {...register("specs_storage")} placeholder="128GB" />
                    </div>
                    <div className="grid gap-2">
                      <Label>RAM</Label>
                      <Input {...register("specs_ram")} placeholder="8GB" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Color</Label>
                      <Input {...register("specs_color")} placeholder="Black" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Battery / Health</Label>
                      <Input {...register("specs_battery")} placeholder="92%" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Processor</Label>
                      <Input {...register("specs_cpu")} placeholder="M2, i7..." />
                    </div>
                    <div className="grid gap-2">
                      <Label>Graphics</Label>
                      <Input {...register("specs_gpu")} placeholder="Integrated, RTX..." />
                    </div>
                    <div className="grid gap-2 col-span-2">
                      <Label>Screen</Label>
                      <Input {...register("specs_screen")} placeholder="6.1-inch, 13-inch..." />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Listing
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListingManager;
