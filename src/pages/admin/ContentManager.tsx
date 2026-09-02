import DOMPurify from "dompurify";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CONTENT_PAGES_COLUMNS } from "@/lib/supabaseColumnMaps";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2,
  Edit,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Search,
  ArrowUp,
  ArrowDown,
  Eye,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { ImageUpload } from "@/components/ui/image-upload";

type PageCategory =
  | "legal"
  | "information"
  | "support"
  | "landing"
  | "services"
  | "offers"
  | "faq"
  | "other";

interface ContentPageForm {
  title: string;
  slug: string;
  content: string;
  is_published: boolean;
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
  category: PageCategory;
  order_index: number;
}

interface ContentPage extends ContentPageForm {
  id: string;
  created_at?: string;
  updated_at?: string;
}

const CATEGORIES: { value: PageCategory; label: string }[] = [
  { value: "legal", label: "Legal" },
  { value: "information", label: "Information" },
  { value: "support", label: "Support" },
  { value: "landing", label: "Landing" },
  { value: "services", label: "Services" },
  { value: "offers", label: "Offers" },
  { value: "faq", label: "FAQ" },
  { value: "other", label: "Other" },
];

const getPageTemplate = (title: string, slug: string): string => {
  const templates: Record<string, string> = {
    "about-us": `
<h1>About Tamrakar Complex</h1>
<p>Welcome to Tamrakar Complex, your trusted destination for all things electronics in Kathmandu, Nepal. Established with a vision to provide premium mobile phones, repair services, exchange programs, and unlocking solutions, we've become a one-stop-shop for tech enthusiasts and everyday users alike.</p>
<h2>Our Story</h2>
<p>Located in the heart of New Road, Tamrakar Complex has been serving the Nepalese community for years, building trust through quality service and genuine products. From the latest flagship smartphones to budget-friendly options, we curate a diverse selection to meet every need.</p>
<h2>What We Offer</h2>
<ul>
  <li><strong>Premium Mobile Phones:</strong> Latest iPhones, Samsung Galaxy, OnePlus, and more with official warranty</li>
  <li><strong>Professional Repair Services:</strong> Screen replacement, battery repair, camera fixes, water damage treatment</li>
  <li><strong>Exchange & Trade-in:</strong> Upgrade your device with fair value for your old phone</li>
  <li><strong>Unlocking Services:</strong> Safe and legal carrier unlocking for all major brands</li>
  <li><strong>Accessories:</strong> Original cases, chargers, screen protectors, and more</li>
</ul>
<h2>Our Commitment</h2>
<p>Customer satisfaction is our top priority. We believe in transparency, fair pricing, and genuine products. Every repair comes with a warranty, and every phone is tested for authenticity.</p>
<h2>Visit Us</h2>
<p>Come experience the Tamrakar Complex difference at New Road, Kathmandu. Our friendly staff is ready to assist you!</p>
    `,
    contact: `
<h1>Contact Us</h1>
<p>Get in touch with Tamrakar Complex! We're here to help with any questions about products, repairs, exchanges, or offers.</p>
<h2>Our Location</h2>
<p><strong>Tamrakar Complex</strong><br>New Road, Kathmandu, Nepal</p>
<h2>Contact Information</h2>
<ul>
  <li><strong>Phone:</strong> +977-1-XXXXXXX</li>
  <li><strong>Mobile:</strong> +977-98XXXXXXXX</li>
  <li><strong>Email:</strong> info@tamrakarcomplex.com</li>
</ul>
<h2>Business Hours</h2>
<ul>
  <li>Sunday to Friday: 9:00 AM - 7:00 PM</li>
  <li>Saturday: 10:00 AM - 5:00 PM</li>
</ul>
<h2>Send Us a Message</h2>
<p>Visit our store or use the contact form on our website for inquiries. We respond within 24 hours!</p>
    `,
    "privacy-policy": `
<h1>Privacy Policy</h1>
<p>Last updated: ${new Date().toLocaleDateString()}</p>
<p>At Tamrakar Complex, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information.</p>
<h2>Information We Collect</h2>
<ul>
  <li>Name, email address, and phone number for service inquiries and bookings</li>
  <li>Device information for repair and exchange services</li>
  <li>Transaction details for purchases and services</li>
</ul>
<h2>How We Use Your Information</h2>
<p>We use your information to process service requests, communicate with you about your orders, and improve our services.</p>
<h2>Data Protection</h2>
<p>We implement appropriate security measures to protect your personal information from unauthorized access or disclosure.</p>
<h2>Contact Us</h2>
<p>If you have questions about our Privacy Policy, please contact us at info@tamrakarcomplex.com</p>
    `,
    terms: `
<h1>Terms of Service</h1>
<p>Last updated: ${new Date().toLocaleDateString()}</p>
<p>By using our services and website, you agree to these Terms of Service.</p>
<h2>Services</h2>
<p>Tamrakar Complex provides mobile phone sales, repair, exchange, and unlocking services. All services are subject to availability and our policies.</p>
<h2>Repairs</h2>
<p>Repairs come with a warranty period as specified at the time of service. Warranty covers parts and labor but not accidental damage after service.</p>
<h2>Returns & Exchanges</h2>
<p>Please refer to our Return & Refund Policy for detailed information about returns and exchanges.</p>
<h2>Liability</h2>
<p>Tamrakar Complex is not responsible for any indirect or consequential damages arising from our services.</p>
<h2>Changes to Terms</h2>
<p>We may update these Terms from time to time. Continued use of our services constitutes acceptance of new terms.</p>
    `,
    returns: `
<h1>Return & Refund Policy</h1>
<p>Last updated: ${new Date().toLocaleDateString()}</p>
<h2>Returns</h2>
<ul>
  <li>New, unopened devices can be returned within 7 days of purchase</li>
  <li>Products must be in original condition with all accessories and packaging</li>
  <li>Proof of purchase is required</li>
</ul>
<h2>Refunds</h2>
<ul>
  <li>Refunds are processed within 7-10 business days</li>
  <li>Refunds are issued to the original payment method</li>
</ul>
<h2>Exchanges</h2>
<p>Defective products can be exchanged within the warranty period. Subject to inspection.</p>
<h2>Repair Services</h2>
<p>Repair services come with a 30-day warranty on parts and labor. If the same issue reoccurs, we'll fix it free of charge.</p>
    `,
    "emi-info": `
<h1>EMI Information</h1>
<p>Shop your dream smartphone now and pay later with easy EMI options at Tamrakar Complex!</p>
<h2>Available EMI Plans</h2>
<ul>
  <li><strong>0% Interest EMI:</strong> 3, 6, 9, and 12-month plans on select devices</li>
  <li><strong>Easy Documentation:</strong> Just a valid ID and bank details</li>
  <li><strong>Quick Approval:</strong> Get approved instantly</li>
</ul>
<h2>Eligibility</h2>
<ul>
  <li>Nepalese citizen with valid ID card</li>
  <li>Active bank account or credit card</li>
</ul>
<h2>How to Apply</h2>
<p>Visit our store at New Road, Kathmandu, and our staff will assist you with the EMI application process!</p>
    `,
    "store-locator": `
<h1>Store Locator</h1>
<p>Find Tamrakar Complex in Kathmandu!</p>
<h2>Main Store</h2>
<p><strong>Tamrakar Complex</strong><br>New Road, Kathmandu, Nepal</p>
<h2>How to Reach Us</h2>
<p>We are centrally located in New Road, easily accessible by public transport and private vehicles.</p>
<h2>Contact</h2>
<p>Call us at +977-1-XXXXXXX or email info@tamrakarcomplex.com for directions or inquiries!</p>
    `,
    careers: `
<h1>Careers at Tamrakar Complex</h1>
<p>Join our team and be part of Nepal's premier electronics destination!</p>
<h2>Current Openings</h2>
<p>Check our social media or contact us for latest job openings in sales, repair, and administration.</p>
<h2>How to Apply</h2>
<p>Send your CV and cover letter to info@tamrakarcomplex.com or drop by our store in New Road.</p>
<h2>Why Work With Us</h2>
<ul>
  <li>Competitive salary and incentives</li>
  <li>Opportunity to work with latest technology</li>
  <li>Friendly and supportive work environment</li>
  <li>Career growth opportunities</li>
</ul>
    `,
    press: `
<h1>Press & Media</h1>
<p>For media inquiries, press releases, and partnership opportunities, contact us!</p>
<h2>Press Contact</h2>
<p>Email: press@tamrakarcomplex.com<br>Phone: +977-98XXXXXXXX</p>
<h2>About Tamrakar Complex</h2>
<p>Tamrakar Complex is a leading electronics retailer and service provider in Nepal, specializing in premium smartphones, professional repairs, and customer-centric services.</p>
    `,
    "repair-services": `
<h1>iPhone & Mobile Repair Services</h1>
<p>Professional repair services for all major brands at Tamrakar Complex!</p>
<h2>Our Repair Services</h2>
<ul>
  <li><strong>Screen Replacement:</strong> Cracked or damaged screen fix with genuine parts</li>
  <li><strong>Battery Repair:</strong> Replace old or swollen batteries</li>
  <li><strong>Camera Fix:</strong> Front and rear camera issues resolved</li>
  <li><strong>Water Damage Treatment:</strong> Professional cleaning and repair</li>
  <li><strong>Charging Port Repair:</strong> Fix loose or broken charging ports</li>
  <li><strong>Speaker & Microphone Repair:</strong> Fix audio issues</li>
</ul>
<h2>Why Choose Tamrakar Complex?</h2>
<ul>
  <li>Genuine parts</li>
  <li>Professional technicians</li>
  <li>Warranty on repairs</li>
  <li>Same-day service on most repairs</li>
</ul>
<p>Visit our New Road store or call us to book a repair!</p>
    `,
    "exchange-tradein": `
<h1>Exchange & Trade-in Program</h1>
<p>Upgrade your smartphone with fair trade-in value at Tamrakar Complex!</p>
<h2>How It Works</h2>
<ol>
  <li>Bring your old phone to our store for evaluation</li>
  <li>Get an instant, fair trade-in value</li>
  <li>Choose your new phone from our wide selection</li>
  <li>Pay the difference and enjoy your upgrade!</li>
</ol>
<h2>What We Accept</h2>
<p>We accept most major brands including Apple, Samsung, OnePlus, Xiaomi, and more. Condition determines trade-in value.</p>
<h2>Top Offers</h2>
<p>Get bonus exchange value during promotional periods! Check our offers page for details.</p>
    `,
    "unlocking-services": `
<h1>iPhone & Mobile Unlocking Services</h1>
<p>Safe and legal carrier unlocking services at Tamrakar Complex!</p>
<h2>Our Unlocking Services</h2>
<ul>
  <li>Carrier unlock for all major brands</li>
  <li>Factory unlock service</li>
  <li>IMEI-based unlocking</li>
</ul>
<h2>Why Choose Us</h2>
<ul>
  <li>Legal and safe unlocking methods</li>
  <li>No data loss</li>
  <li>Quick turnaround time</li>
  <li>Affordable pricing</li>
</ul>
<p>Contact us for more information about unlocking your device!</p>
    `,
    "current-offers": `
<h1>Current Offers</h1>
<p>Check out the latest deals and offers at Tamrakar Complex!</p>
<h2>Featured Offers</h2>
<ul>
  <li><strong>Monsoon Sale:</strong> Massive discounts on iPhones and Samsung devices</li>
  <li><strong>Exchange Bonus:</strong> Extra Rs. 5000 when you exchange your old phone</li>
  <li><strong>Free Accessory:</strong> Free case and screen protector with select purchases</li>
</ul>
<h2>Limited Time Only!</h2>
<p>Offers are subject to availability and may end without prior notice. Visit our store for latest deals!</p>
    `,
    faq: `
<h1>Frequently Asked Questions</h1>
<h2>Products</h2>
<p><strong>Q: Do you sell genuine products?</strong><br>A: Yes, all products at Tamrakar Complex are genuine with official warranty.</p>
<p><strong>Q: Do you offer EMI?</strong><br>A: Yes, we have easy EMI options for select devices.</p>
<h2>Repairs</h2>
<p><strong>Q: How long does a repair take?</strong><br>A: Most repairs are done same-day, depending on parts availability.</p>
<p><strong>Q: Do you give warranty on repairs?</strong><br>A: Yes, we provide 30-day warranty on parts and labor.</p>
<h2>Exchange</h2>
<p><strong>Q: How is trade-in value calculated?</strong><br>A: Trade-in value is based on model, condition, age, and market price.</p>
<h2>Unlocking</h2>
<p><strong>Q: Is unlocking legal?</strong><br>A: Yes, we use only legal and safe unlocking methods.</p>
    `,
    "shipping-delivery": `
<h1>Shipping & Delivery</h1>
<p>Information about shipping and delivery options at Tamrakar Complex.</p>
<h2>Delivery Options</h2>
<ul>
  <li><strong>In-Store Pickup:</strong> Free pickup from our New Road store</li>
  <li><strong>Local Delivery:</strong> Same-day delivery within Kathmandu Valley (chargeable)</li>
  <li><strong>National Shipping:</strong> To all major cities in Nepal via trusted partners</li>
</ul>
<h2>Shipping Charges</h2>
<p>Shipping charges vary by location and package weight. Contact us for exact rates.</p>
<h2>Delivery Time</h2>
<ul>
  <li>Kathmandu Valley: 24 hours</li>
  <li>Other cities: 3-7 business days</li>
</ul>
    `,
    "warranty-guarantee": `
<h1>Warranty & Guarantee</h1>
<p>Learn about our warranty policy at Tamrakar Complex.</p>
<h2>Product Warranty</h2>
<p>All new products come with official manufacturer warranty as per brand policy.</p>
<h2>Repair Warranty</h2>
<p>We provide 30-day warranty on all repair services for parts and labor.</p>
<h2>What's Covered</h2>
<ul>
  <li>Manufacturing defects in products</li>
  <li>Parts replaced during repair</li>
  <li>Labor for covered repairs</li>
</ul>
<h2>What's Not Covered</h2>
<ul>
  <li>Physical or water damage</li>
  <li>Unauthorized repairs</li>
  <li>Normal wear and tear</li>
</ul>
    `,
    "payment-methods": `
<h1>Payment Methods</h1>
<p>Flexible payment options at Tamrakar Complex!</p>
<h2>Available Payment Methods</h2>
<ul>
  <li><strong>Cash:</strong> Nepali Rupees (NPR)</li>
  <li><strong>Card Payments:</strong> Visa, MasterCard, UnionPay</li>
  <li><strong>Mobile Banking:</strong> eSewa, Khalti, IME Pay</li>
  <li><strong>EMI:</strong> Easy installment plans</li>
</ul>
    `,
    "track-repair": `
<h1>Track Your Repair</h1>
<p>Check the status of your repair at Tamrakar Complex.</p>
<h2>How to Track</h2>
<p>Call us at +977-1-XXXXXXX or visit our store with your repair receipt to check the status of your device.</p>
    `,
  };

  return templates[slug] || `<h1>${title}</h1><p>Content coming soon...</p>`;
};

const DEFAULT_PAGES: Partial<ContentPageForm>[] = [
  { title: "About Us", slug: "about-us", category: "information", order_index: 1 },
  { title: "Contact Us", slug: "contact", category: "support", order_index: 2 },
  { title: "Privacy Policy", slug: "privacy-policy", category: "legal", order_index: 3 },
  { title: "Terms of Service", slug: "terms", category: "legal", order_index: 4 },
  { title: "Return & Refund Policy", slug: "returns", category: "legal", order_index: 5 },
  { title: "EMI Information", slug: "emi-info", category: "information", order_index: 6 },
  { title: "Store Locator", slug: "store-locator", category: "information", order_index: 7 },
  { title: "Careers", slug: "careers", category: "information", order_index: 8 },
  { title: "Press & Media", slug: "press", category: "information", order_index: 9 },
  { title: "Repair Services", slug: "repair-services", category: "services", order_index: 10 },
  { title: "Exchange & Trade-in", slug: "exchange-tradein", category: "services", order_index: 11 },
  { title: "Unlocking Services", slug: "unlocking-services", category: "services", order_index: 12 },
  { title: "Current Offers", slug: "current-offers", category: "offers", order_index: 13 },
  { title: "FAQ", slug: "faq", category: "faq", order_index: 14 },
  { title: "Shipping & Delivery", slug: "shipping-delivery", category: "support", order_index: 15 },
  { title: "Warranty & Guarantee", slug: "warranty-guarantee", category: "information", order_index: 16 },
  { title: "Payment Methods", slug: "payment-methods", category: "information", order_index: 17 },
  { title: "Track Your Repair", slug: "track-repair", category: "support", order_index: 18 },
];

const ContentManager = () => {
  const [editingPage, setEditingPage] = useState<ContentPage | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const queryClient = useQueryClient();
  const { register, handleSubmit, setValue, reset, watch } =
    useForm<ContentPageForm>();

  const { data: pages, isLoading, error: pagesError } = useQuery<ContentPage[]>({
    queryKey: ["admin_content_pages"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("content_pages")
          .select(CONTENT_PAGES_COLUMNS.join(","))
          .order("order_index", { ascending: true })
          .order("title", { ascending: true });

        if (error) throw error;
        return data as ContentPage[];
      } catch (err) {
        toast.error("Failed to fetch content pages");
        return [];
      }
    },
    retry: 1,
  });

  const filteredPages = pages?.filter((page) => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || page.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const saveMutation = useMutation({
    mutationFn: async (values: ContentPageForm) => {
      if (editingPage) {
        const { error } = await supabase
          .from("content_pages")
          .update(values)
          .eq("id", editingPage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("content_pages")
          .insert([values]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_content_pages"] });
      setIsOpen(false);
      reset();
      toast.success(
        editingPage ? "Page updated successfully" : "Page created successfully"
      );
    },
    onError: (error) => {
      toast.error(`Error saving page: ${(error as Error).message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("content_pages")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_content_pages"] });
      toast.success("Page deleted successfully");
    },
    onError: (error) => {
      toast.error(`Error deleting page: ${(error as Error).message}`);
    },
  });

  const movePage = async (page: ContentPage, direction: "up" | "down") => {
    const currentIndex = filteredPages?.findIndex(p => p.id === page.id);
    if (currentIndex === undefined || currentIndex === -1) return;

    let targetPage;
    if (direction === "up" && currentIndex > 0) {
      targetPage = filteredPages[currentIndex - 1];
    } else if (direction === "down" && currentIndex < (filteredPages?.length || 0) - 1) {
      targetPage = filteredPages[currentIndex + 1];
    } else {
      return;
    }

    if (targetPage) {
      const tempOrder = page.order_index;
      const { error: error1 } = await supabase.from("content_pages").update({ order_index: targetPage.order_index }).eq("id", page.id);
      const { error: error2 } = await supabase.from("content_pages").update({ order_index: tempOrder }).eq("id", targetPage.id);
      
      if (error1 || error2) {
        toast.error("Failed to reorder pages");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["admin_content_pages"] });
      toast.success("Page reordered successfully");
    }
  };

  const handleEdit = (page: ContentPage) => {
    setEditingPage(page);
    setValue("title", page.title);
    setValue("slug", page.slug);
    setValue("content", page.content || "");
    setValue("is_published", page.is_published);
    setValue("meta_title", page.meta_title || "");
    setValue("meta_description", page.meta_description || "");
    setValue("og_image", page.og_image || "");
    setValue("category", page.category || "other");
    setValue("order_index", page.order_index || 0);
    setUploadedImages(page.og_image ? [page.og_image] : []);
    setIsOpen(true);
  };

  const handleCreate = () => {
    setEditingPage(null);
    reset({
      title: "",
      slug: "",
      content: "",
      is_published: true,
      category: "other",
      order_index: (pages?.length || 0) + 1,
    });
    setUploadedImages([]);
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this page?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (values: ContentPageForm) => {
    saveMutation.mutate(values);
  };

  useEffect(() => {
    if (!isOpen) return;
    const key = `content-draft-${editingPage?.slug || "new"}`;
    const existing = localStorage.getItem(key);
    if (existing) {
      try {
        const draft = JSON.parse(existing) as Partial<ContentPageForm> & {
          images?: string[];
        };
        if (draft.title) setValue("title", draft.title);
        if (draft.slug) setValue("slug", draft.slug);
        if (draft.content) setValue("content", draft.content);
        if (typeof draft.is_published === "boolean")
          setValue("is_published", draft.is_published);
        if (draft.category) setValue("category", draft.category);
        if (draft.order_index !== undefined)
          setValue("order_index", draft.order_index);
        if (draft.meta_title) setValue("meta_title", draft.meta_title);
        if (draft.meta_description)
          setValue("meta_description", draft.meta_description);
        if (draft.og_image) setValue("og_image", draft.og_image);
        setUploadedImages(draft.images || []);
      } catch {
        // ignore
      }
    }
  }, [isOpen, editingPage, setValue]);

  const persistDraft = () => {
    const formEl = document.querySelector<HTMLFormElement>("#content-form");
    if (!formEl) return;
    const fd = new FormData(formEl);
    const draft: Partial<ContentPageForm> & { images?: string[] } = {
      title: String(fd.get("title") || ""),
      slug: String(fd.get("slug") || ""),
      content: String(fd.get("content") || ""),
      is_published: String(fd.get("is_published") || "") === "on",
      category: String(fd.get("category") || "other") as PageCategory,
      order_index: parseInt(String(fd.get("order_index") || "0")),
      meta_title: String(fd.get("meta_title") || ""),
      meta_description: String(fd.get("meta_description") || ""),
      og_image: String(fd.get("og_image") || ""),
      images: uploadedImages,
    };
    const key = `content-draft-${editingPage?.slug || "new"}`;
    localStorage.setItem(key, JSON.stringify(draft));
    toast.success("Draft saved locally");
  };

  const insertImageTag = (url: string) => {
    const contentEl = document.getElementById("content") as
      | HTMLTextAreaElement
      | null;
    if (!contentEl) return;
    const tag = `<img src="${url}" alt="" />`;
    const start = contentEl.selectionStart ?? contentEl.value.length;
    const end = contentEl.selectionEnd ?? contentEl.value.length;
    const newVal =
      contentEl.value.slice(0, start) + tag + contentEl.value.slice(end);
    setValue("content", newVal);
  };

  const createDefaultPages = async () => {
    const existingSlugs = new Set(pages?.map((p) => p.slug));
    const toCreate = DEFAULT_PAGES.filter(
      (p) => p.slug && !existingSlugs.has(p.slug)
    );

    if (toCreate.length === 0) {
      toast.info("All default pages already exist!");
      return;
    }

    for (const page of toCreate) {
      try {
        await supabase.from("content_pages").insert([
          {
            ...page,
            content: getPageTemplate(page.title || "", page.slug || ""),
            is_published: false,
            meta_title: `${page.title} | Tamrakar Complex`,
            meta_description: `${page.title} page for Tamrakar Complex, Kathmandu, Nepal.`,
          },
        ]);
      } catch (err) {
        console.error(err);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["admin_content_pages"] });
    toast.success(`${toCreate.length} default pages created!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Pages</h1>
          <p className="text-muted-foreground">
            Manage static pages like About Us, Contact, Privacy Policy, and more.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={createDefaultPages}>
            <Plus className="h-4 w-4 mr-2" />
            Add Default Pages
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Page
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {pagesError ? (
        <div className="border rounded-md p-8 text-center">
          <div className="text-red-600 font-semibold mb-2">Error loading content pages</div>
          <div className="text-sm text-muted-foreground mb-4">
            {(pagesError as any)?.message || String(pagesError)}
          </div>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">SN</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredPages && filteredPages.length > 0 ? (
                filteredPages.map((page, index) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{page.title}</TableCell>
                    <TableCell className="font-mono text-sm">{page.slug}</TableCell>
                    <TableCell>
                      <span className="capitalize">
                        {CATEGORIES.find((c) => c.value === page.category)?.label ||
                          page.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => movePage(page, "up")}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <span>{page.order_index}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === (filteredPages?.length || 0) - 1}
                          onClick={() => movePage(page, "down")}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {page.is_published ? (
                        <div className="flex items-center text-green-600 gap-1">
                          <CheckCircle className="h-4 w-4" /> Published
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-500 gap-1">
                          <XCircle className="h-4 w-4" /> Draft
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title="View Page"
                        >
                          <a
                            href={`/page/${page.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(page)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(page.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-32">
                    <div className="text-muted-foreground">
                      No content pages yet. Click "Add Default Pages" to get started!
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPage ? `Edit Page: ${editingPage.title}` : "Create New Page"}
            </DialogTitle>
          </DialogHeader>
          <form
            id="content-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 grid gap-2">
                <Label htmlFor="page-title">Title</Label>
                <Input id="page-title" {...register("title", { required: true })} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="page-slug">Slug</Label>
                <Input
                  id="page-slug"
                  {...register("slug", { required: true })}
                  disabled={!!editingPage}
                  placeholder="e.g. about-us"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="page-category">Category</Label>
                <Select
                  value={watch("category")}
                  onValueChange={(v) => setValue("category", v as PageCategory)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="page-order">Order Index</Label>
                <Input
                  id="page-order"
                  type="number"
                  {...register("order_index", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="page-meta-title">Meta Title (SEO)</Label>
              <Input
                id="page-meta-title"
                {...register("meta_title")}
                placeholder="Title for search engines and social media"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page-meta-desc">Meta Description (SEO)</Label>
              <Textarea
                id="page-meta-desc"
                {...register("meta_description")}
                placeholder="Brief description of the page for search engines"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page-og-image">Open Graph Image (OG Image)</Label>
              <ImageUpload
                value={uploadedImages}
                onChange={(val) => {
                  setUploadedImages(val);
                  if (val[0]) setValue("og_image", val[0]);
                }}
                disabled={saveMutation.isPending}
              />
              <Input
                id="og_image"
                type="hidden"
                {...register("og_image")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content (HTML supported)</Label>
              <Textarea
                id="content"
                {...register("content")}
                className="min-h-[320px] font-mono"
              />
              {showPreview && (
                <div className="mt-3 border rounded-lg p-4 bg-secondary/30">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">
                    Live Preview
                  </div>
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(watch("content") || ""),
                    }}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={showPreview ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowPreview((v) => !v)}
                >
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={persistDraft}
                >
                  Save Draft (Local)
                </Button>
              </div>
              <div className="pt-2 space-y-2">
                <Label>Upload Image for Content</Label>
                <ImageUpload
                  value={[]}
                  onChange={(val) => {
                    if (val[0]) insertImageTag(val[0]);
                  }}
                  disabled={saveMutation.isPending}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_published"
                  checked={watch("is_published")}
                  onCheckedChange={(v) => setValue("is_published", v)}
                />
                <Label htmlFor="is_published">Published</Label>
              </div>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingPage ? "Save Changes" : "Create Page"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentManager;
