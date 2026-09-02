import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { resolveListingImage } from "@/lib/phoneImages";
import { Loader2, ArrowLeft, MapPin, Calendar, User, Edit, Store, ShoppingCart, Zap, MessageCircle, Heart, Share2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { SEO } from "@/components/common/SEO";
import { SafeImage } from "@/components/common/SafeImage";
import { decodeListingDescription, formatCondition, toCoarseLocation } from "@/lib/listingMeta";
import { absoluteUrl, breadcrumbSchema } from "@/lib/seo";
import { getPublicStorePath } from "@/lib/storeRoutes";
import { getFallbackMarketplaceListings } from "@/services/publicFallbackData";
import { useCart } from "@/contexts/CartContext";
import { canShowPhoneNumber } from "@/lib/storePackages";
import { buildWhatsAppPurchaseUrl } from "@/lib/marketplaceContact";
import { useWishlist } from "@/hooks/useWishlist";
import { toast } from "sonner";

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  seo_slug?: string | null;
  logo_url: string | null;
  shop_no: string | null;
  location: string | null;
  is_verified: boolean;
  phone?: string | null;
  whatsapp?: string | null;
  package_slug?: string | null;
  is_featured?: boolean | null;
  subscription_status?: string | null;
}

type ListingDetailRecord = {
  id: string;
  source_type?: "store_product" | "user_listing";
  user_id?: string | null;
  owner_user_id?: string | null;
  created_by?: string | null;
  store_id?: string | null;
  store_name?: string | null;
  catalog_product_id?: string | null;
  stock?: number | null;
  contact_info?: string | null;
  title: string;
  description: string | null;
  price: number;
  condition: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  images: string[] | null;
  location: string | null;
  created_at: string;
};

export default function ListingDetail() {
  const { id } = useParams();
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { hasItem, toggleItem } = useWishlist();
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [store, setStore] = useState<StoreInfo | null>(null);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["sell_listing", id],
    queryFn: async () => {
      const { data: unifiedData } = await (supabase as any)
        .from("public_marketplace_items")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (unifiedData) {
        const rawImages = Array.isArray(unifiedData.images)
          ? unifiedData.images
          : unifiedData.images
            ? Object.values(unifiedData.images as Record<string, string>).filter(Boolean)
            : [];
        const resolvedFirst = resolveListingImage(
          unifiedData.title ?? null,
          unifiedData.brand ?? null,
          rawImages,
          unifiedData.model ?? null,
        );
        const images: string[] = resolvedFirst
          ? [resolvedFirst, ...rawImages.filter((u: string) => u !== resolvedFirst)]
          : rawImages;
        return {
          ...unifiedData,
          user_id: unifiedData.created_by,
          owner_user_id: unifiedData.created_by,
          listing_type: unifiedData.source_type,
          images,
          contact_info: null,
        } as ListingDetailRecord;
      }

      const { data, error } = await supabase
        .from("sell_listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (data) {
        const rawImgs = Array.isArray(data.images) ? data.images as string[] : [];
        const resolvedFirst = resolveListingImage(
          data.title ?? null,
          (data as any).brand ?? null,
          rawImgs,
          (data as any).model ?? null,
        );
        const resolvedImgs: string[] = resolvedFirst
          ? [resolvedFirst, ...rawImgs.filter((u) => u !== resolvedFirst)]
          : rawImgs;
        return { ...data, images: resolvedImgs } as ListingDetailRecord;
      }

      const { data: marketplaceData, error: marketplaceError } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (marketplaceData) {
        return {
          ...marketplaceData,
          user_id: marketplaceData.owner_user_id,
          contact_info: null,
        } as ListingDetailRecord;
      }

      if (error || marketplaceError || !data) {
        const fallback = getFallbackMarketplaceListings().find((item) => item.id === id);
        if (fallback) return fallback as ListingDetailRecord;
        throw error || marketplaceError || new Error("Listing not found");
      }
      return data as ListingDetailRecord;
    },
    enabled: !!id,
  });

  // Fetch store if store_id exists in listing
  useEffect(() => {
    async function fetchStore() {
      if (listing?.store_id) {
        const { data } = await supabase
          .from("stores")
          .select("id, name, slug, seo_slug, logo_url, shop_no, location, is_verified, phone, whatsapp, package_slug, is_featured, subscription_status")
          .eq("id", listing.store_id)
          .single();
        if (data) setStore(data as StoreInfo);
      }
    }
    fetchStore();
  }, [listing?.store_id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 container py-20 text-center">
          <h1 className="text-2xl font-bold">Listing not found</h1>
          <Button asChild className="mt-4">
            <Link to="/marketplace">Back to Marketplace</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const isOwner = session?.user.id === (listing.user_id || listing.owner_user_id || listing.created_by);
  const images = listing.images || [];
  const currentImage = activeImage || (images.length > 0 ? images[0] : null);
  const { text: publicDescription, meta } = decodeListingDescription(listing.description);
  const conditionLabel = formatCondition(listing.condition);
  const locationLabel = listing.location || "Nepal";
  const shownLocation = meta?.hide_precise_location ? toCoarseLocation(locationLabel) : locationLabel;
  const availableDate =
    meta?.available_date ? new Date(meta.available_date).toLocaleDateString() : null;
  const contactInfo = listing.contact_info || "";
  const isCatalogProduct = listing.source_type === "store_product";
  const canCheckout = isCatalogProduct && Boolean(listing.store_id) && Number(listing.stock ?? 0) > 0;
  const checkoutProduct = {
    id: listing.id,
    store_product_id: listing.id,
    source_type: "store_product" as const,
    name: listing.title,
    slug: `marketplace-${listing.id}`,
    brand: listing.brand,
    price: `NPR ${listing.price.toLocaleString()}`,
    price_value: listing.price,
    store_id: listing.store_id,
    image: currentImage,
    images,
    rating: null,
    category: listing.category || "marketplace",
    description: publicDescription,
    in_stock: canCheckout,
    stock_quantity: listing.stock,
  };
  const storeContact = store ? canShowPhoneNumber(store.package_slug, {
    isActive: store.subscription_status === "active" || store.subscription_status === "trialing",
    isFeatured: Boolean(store.is_featured),
    featuredContactVisible: Boolean(store.is_featured),
    isLoggedIn: Boolean(user),
  }) : null;
  const contactNumber = store
    ? (storeContact?.showWhatsApp ? store.whatsapp || store.phone : null)
    : contactInfo;
  const whatsappUrl = buildWhatsAppPurchaseUrl(contactNumber, {
    id: listing.id,
    title: listing.title,
    price: listing.price,
    condition: conditionLabel,
    storeName: store?.name,
  }, absoluteUrl(`/marketplace/listing/${listing.id}`));
  const openWhatsApp = () => {
    if (!whatsappUrl) return;
    if (user && listing.store_id) {
      void (supabase as any).rpc("record_marketplace_whatsapp_intent", {
        p_store_id: listing.store_id,
        p_item_id: listing.id,
        p_item_title: listing.title,
        p_item_price: listing.price,
        p_source_page: `/marketplace/listing/${listing.id}`,
      });
    }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };
  const saved = hasItem(listing.id);
  const saveProduct = () => {
    const added = toggleItem(checkoutProduct);
    toast.success(added ? "Saved to your wishlist" : "Removed from your wishlist");
  };
  const shareProduct = async () => {
    const url = absoluteUrl(`/marketplace/listing/${listing.id}`);
    try {
      if (navigator.share) await navigator.share({ title: listing.title, text: `${listing.title} — NPR ${listing.price.toLocaleString()}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Listing link copied");
      }
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") toast.error("Could not share this listing");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={listing.title}
        description={publicDescription || `${listing.title} marketplace listing in ${shownLocation}.`}
        image={images[0] || undefined}
        url={`/marketplace/listing/${listing.id}`}
        keywords={["marketplace listing", listing.brand || "gadget", listing.category || "device"]}
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: listing.title,
            image: images.length ? images : undefined,
            description: publicDescription,
            brand: listing.brand ? { "@type": "Brand", name: listing.brand } : undefined,
            offers: {
              "@type": "Offer",
              priceCurrency: "NPR",
              price: listing.price,
              availability: "https://schema.org/InStock",
              itemCondition:
                listing.condition === "new"
                  ? "https://schema.org/NewCondition"
                  : listing.condition === "like_new"
                    ? "https://schema.org/UsedCondition"
                    : "https://schema.org/UsedCondition",
              url: absoluteUrl(`/marketplace/listing/${listing.id}`),
            },
          },
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Marketplace", url: "/marketplace" },
            { name: listing.title, url: `/marketplace/listing/${listing.id}` },
          ]),
        ]}
      />
      <Header />
      <div className="container py-8 max-w-6xl flex-1">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" asChild className="pl-0 hover:bg-transparent">
            <Link to="/marketplace" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Listings
            </Link>
          </Button>
          <div className="flex items-center gap-2">
          {canCheckout ? <Button variant="outline" size="sm" onClick={saveProduct}><Heart className={`mr-2 h-4 w-4 ${saved ? "fill-rose-500 text-rose-500" : ""}`} />{saved ? "Saved" : "Save"}</Button> : null}
          <Button variant="outline" size="sm" onClick={shareProduct}><Share2 className="mr-2 h-4 w-4" />Share</Button>
          {isOwner && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to={listing.source_type === "store_product" ? "/storeadmin/products" : `/marketplace/edit/${listing.id}`}>
                <Edit className="h-4 w-4" />
                Edit Listing
              </Link>
            </Button>
          )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 rounded-[2rem] border bg-card/60 p-4 md:p-7 shadow-[0_30px_80px_-45px_rgba(15,23,42,.45)]">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-square bg-[radial-gradient(circle_at_center,hsl(var(--background)),hsl(var(--muted)))] rounded-[1.75rem] overflow-hidden flex items-center justify-center text-muted-foreground text-lg relative border">
              <SafeImage 
                src={currentImage} 
                alt={listing.title} 
                aspect="square"
                width={720}
                height={720}
                className={`w-full h-full ${isCatalogProduct ? "object-contain p-6 md:p-10" : "object-contain"}`}
              />
            </div>
            
            {images.length > 1 && (
              <Carousel className="w-full max-w-xs mx-auto">
                <CarouselContent className="-ml-2">
                  {images.map((img: string, index: number) => (
                    <CarouselItem key={`${index}-${img}`} className="pl-2 basis-1/4">
                      <div 
                        className={`aspect-square rounded-xl overflow-hidden cursor-pointer border-2 bg-muted transition-all ${activeImage === img || (!activeImage && index === 0) ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}
                        onClick={() => setActiveImage(img)}
                      >
                        <SafeImage 
                          src={img} 
                          alt={`${listing.title} ${index + 1}`} 
                          aspect="square"
                          width={144}
                          height={144}
                          className={`w-full h-full ${isCatalogProduct ? "object-contain p-2" : "object-cover"}`}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                 <Badge variant="secondary" className="uppercase tracking-wider font-semibold">{conditionLabel}</Badge>
                 <Badge variant="outline" className="uppercase tracking-wider">{listing.category}</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{listing.title}</h1>
              <div className="text-3xl font-bold text-primary">
                Rs. {listing.price.toLocaleString()}
              </div>
              {canCheckout ? (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Button size="lg" variant="outline" className="h-12 rounded-xl font-bold" onClick={() => addToCart(checkoutProduct)}><ShoppingCart className="mr-2 h-5 w-5" />Add to cart</Button>
                  <Button size="lg" className="h-12 rounded-xl font-bold" onClick={() => { addToCart(checkoutProduct); navigate("/checkout"); }}><Zap className="mr-2 h-5 w-5" />Buy now</Button>
                  {whatsappUrl ? <Button size="lg" className="col-span-2 h-12 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700" onClick={openWhatsApp}><MessageCircle className="mr-2 h-5 w-5" />Ask to buy on WhatsApp</Button> : null}
                </div>
              ) : isCatalogProduct ? (
                <Badge variant="secondary" className="mt-5">Currently out of stock</Badge>
              ) : (
                <p className="mt-5 rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">Private-seller listings use direct seller contact. Platform checkout is available for store inventory.</p>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-2 rounded-2xl border bg-emerald-500/5 p-3 text-center text-xs font-medium">
              <span><ShieldCheck className="mx-auto mb-1 h-4 w-4 text-emerald-600" />Verify IMEI</span>
              <span><ShieldCheck className="mx-auto mb-1 h-4 w-4 text-emerald-600" />Confirm warranty</span>
              <span><ShieldCheck className="mx-auto mb-1 h-4 w-4 text-emerald-600" />Pay securely</span>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                   <MapPin className="h-4 w-4" />
                 </div>
                 <div>
                   <p className="text-muted-foreground text-xs">Location</p>
                   <p className="font-medium">{shownLocation}</p>
                 </div>
               </div>
               
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                   <Calendar className="h-4 w-4" />
                 </div>
                 <div>
                   <p className="text-muted-foreground text-xs">Posted On</p>
                   <p className="font-medium">{new Date(listing.created_at).toLocaleDateString()}</p>
                 </div>
               </div>

               {availableDate ? (
                 <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                     <Calendar className="h-4 w-4" />
                   </div>
                   <div>
                     <p className="text-muted-foreground text-xs">Available From</p>
                     <p className="font-medium">{availableDate}</p>
                   </div>
                 </div>
               ) : null}
               
               {listing.brand && (
                 <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                     <span className="text-xs font-bold">B</span>
                   </div>
                   <div>
                     <p className="text-muted-foreground text-xs">Brand</p>
                     <p className="font-medium">{listing.brand}</p>
                   </div>
                 </div>
               )}

               {listing.model && (
                 <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                     <span className="text-xs font-bold">M</span>
                   </div>
                   <div>
                     <p className="text-muted-foreground text-xs">Model</p>
                     <p className="font-medium">{listing.model}</p>
                   </div>
                 </div>
               )}
            </div>

            {(meta?.subcategory || meta?.specs || meta?.item_details || meta?.delivery || meta?.hide_precise_location) ? (
              <Card>
                <CardContent className="p-6 space-y-5">
                  <h3 className="font-semibold text-lg">Product Details</h3>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {meta?.subcategory ? (
                      <div className="rounded-lg border bg-muted/20 p-4">
                        <p className="text-xs text-muted-foreground">Subcategory</p>
                        <p className="font-medium">{meta.subcategory}</p>
                      </div>
                    ) : null}
                    {typeof meta?.location_radius_km === "number" ? (
                      <div className="rounded-lg border bg-muted/20 p-4">
                        <p className="text-xs text-muted-foreground">Location Radius</p>
                        <p className="font-medium">{meta.location_radius_km} km</p>
                      </div>
                    ) : null}
                  </div>

                  {meta?.specs && Object.keys(meta.specs).length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Product Specifications</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {Object.entries(meta.specs).map(([k, v]) => (
                          <div key={k} className="rounded-lg border bg-muted/10 p-3">
                            <p className="text-xs text-muted-foreground">{k}</p>
                            <p className="text-sm font-medium">{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {meta?.item_details ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Item Details</p>
                      <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground whitespace-pre-wrap">
                        {meta.item_details}
                      </div>
                    </div>
                  ) : null}

                  {(meta?.delivery?.meetup || meta?.delivery?.home_delivery || meta?.delivery?.courier || meta?.delivery?.notes) ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Location & Delivery</p>
                      <div className="flex flex-wrap gap-2">
                        {meta?.delivery?.meetup ? <Badge variant="outline">Meetup</Badge> : null}
                        {meta?.delivery?.home_delivery ? <Badge variant="outline">Home delivery</Badge> : null}
                        {meta?.delivery?.courier ? <Badge variant="outline">Courier</Badge> : null}
                        {meta?.hide_precise_location ? <Badge variant="secondary">Precise location hidden</Badge> : null}
                      </div>
                      {meta?.delivery?.notes ? (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{meta.delivery.notes}</p>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {store ? (
              <Card className="border-primary/20 bg-primary/5 overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-primary/10 px-6 py-3 border-b border-primary/10 flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-primary">
                      <Store className="h-4 w-4" />
                      Store Listing
                    </h3>
                    {store.is_verified && (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600">Verified Store</Badge>
                    )}
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-xl border bg-card overflow-hidden shrink-0">
                        {store.logo_url ? (
                          <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-secondary">
                            <Store className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-xl">{store.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {store.location} {store.shop_no ? `· Shop ${store.shop_no}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 rounded-xl h-11 font-bold" asChild>
                        <Link to={getPublicStorePath(store)}>Visit Store Page</Link>
                      </Button>
                      <Button variant="outline" className="rounded-xl h-11 font-bold border-primary/20" asChild>
                        <Link to={`/marketplace?store=${store.id}`}>All Listings</Link>
                      </Button>
                      {storeContact?.showPhone && store.phone ? <Button variant="outline" className="h-11 font-bold" onClick={() => window.open(`tel:${store.phone}`)}>Call Store</Button> : null}
                    </div>
                    {whatsappUrl ? <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={openWhatsApp}><MessageCircle className="mr-2 h-4 w-4" />WhatsApp product details</Button> : null}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-primary" />
                    Seller Information
                  </h3>
                  
                  <div className="bg-muted/30 p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Contact Details</p>
                    <p className="text-lg font-medium select-all">{contactInfo || "Not provided"}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 w-full"
                      disabled={!contactInfo}
                      onClick={() => window.open(`tel:${contactInfo}`)}
                    >
                      Call Seller
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <h3 className="font-semibold text-lg mb-3">Description</h3>
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap bg-muted/20 p-4 rounded-lg border">
                {publicDescription || "No description provided."}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
