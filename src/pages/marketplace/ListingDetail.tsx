import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, MapPin, Calendar, User, Edit } from "lucide-react";
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
import { getFallbackMarketplaceListings } from "@/services/publicFallbackData";

export default function ListingDetail() {
  const { id } = useParams();
  const { session } = useAuth();
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["sell_listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sell_listings")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        const fallback = getFallbackMarketplaceListings().find((item) => item.id === id);
        if (fallback) return fallback;
        throw error || new Error("Listing not found");
      }
      return data;
    },
    enabled: !!id,
  });

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

  const isOwner = session?.user.id === listing.user_id;
  const images = listing.images || [];
  const currentImage = activeImage || (images.length > 0 ? images[0] : null);
  const { text: publicDescription, meta } = decodeListingDescription(listing.description);
  const conditionLabel = formatCondition(listing.condition);
  const locationLabel = listing.location || "Nepal";
  const shownLocation = meta?.hide_precise_location ? toCoarseLocation(locationLabel) : locationLabel;
  const availableDate =
    meta?.available_date ? new Date(meta.available_date).toLocaleDateString() : null;
  const contactInfo = listing.contact_info || "";

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
          {isOwner && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to={`/marketplace/edit/${listing.id}`}>
                <Edit className="h-4 w-4" />
                Edit Listing
              </Link>
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-xl overflow-hidden flex items-center justify-center text-muted-foreground text-lg relative border">
              <SafeImage 
                src={currentImage} 
                alt={listing.title} 
                className="w-full h-full object-contain bg-white"
              />
            </div>
            
            {images.length > 1 && (
              <Carousel className="w-full max-w-xs mx-auto">
                <CarouselContent className="-ml-2">
                  {images.map((img: string, index: number) => (
                    <CarouselItem key={`${index}-${img}`} className="pl-2 basis-1/4">
                      <div 
                        className={`aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all ${activeImage === img || (!activeImage && index === 0) ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}
                        onClick={() => setActiveImage(img)}
                      >
                        <SafeImage 
                          src={img} 
                          alt={`${listing.title} ${index + 1}`} 
                          className="w-full h-full object-cover"
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
            </div>

            <Separator />

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
                  {/* Future: Add Chat Button Here */}
                </div>
                <p className="text-xs text-muted-foreground">
                  This form may be protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.
                </p>
              </CardContent>
            </Card>

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
