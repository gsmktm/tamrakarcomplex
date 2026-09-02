
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formatEdgeFunctionError } from "@/lib/utils";
import { assertEdgeFunctionAvailable } from "@/lib/edgeFunctions";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { Loader2, Plus, Pencil, Trash2, Search, Download, ExternalLink, ShoppingCart, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { ImageUpload } from "@/components/ui/image-upload";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { ARTICLES_COLUMNS, PRODUCTS_COLUMNS } from "@/lib/supabaseColumnMaps";

interface ArticleFormValues {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  category_label: string;
  image: string;
  author: string;
  read_time: string;
  source_url: string;
  source_site: string;
  featured: boolean;
  published: boolean;
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
}

type ArticleCategory = Enums<"article_category">;
type ArticleRow = Tables<"articles">;
type ProductRow = Tables<"products">;
type ArticleSeed = Omit<ArticleFormValues, "featured" | "published"> & {
  featured?: boolean;
  published?: boolean;
};

const toArticleCategory = (value: string): ArticleCategory => {
  const normalized = value as ArticleCategory;
  const allowed: ArticleCategory[] = [
    "mobile",
    "laptop",
    "tablet",
    "audio",
    "watch",
    "gaming",
    "news",
    "review",
    "comparison",
    "guide",
    "price",
  ];
  return allowed.includes(normalized) ? normalized : "news";
};

const ArticleManager = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleRow | null>(null);
  const [search, setSearch] = useState("");
  const [importUrl, setImportUrl] = useState("https://www.gadgetbytenepal.com/sitemaps/posts.xml");
  const [importLimit, setImportLimit] = useState(200);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [ogUploadedImages, setOgUploadedImages] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const pageSize = 10;
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "created_at", direction: "desc" });
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch, control } = useForm<ArticleFormValues>({
    defaultValues: {
      featured: false,
      published: true,
      author: "Admin",
      category_label: "",
      read_time: "5 min read",
      slug: "",
      source_site: "gadgetbytenepal.com",
      source_url: "",
    },
  });

  const formValues = watch();
  const { role } = useAuth();
  const isPlatformAdmin = role === "suadmin" || role === "staffadmin";

  const { data: articles, isLoading, error: articlesError } = useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("articles")
          .select(ARTICLES_COLUMNS.join(","))
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return data;
      } catch (err) {
        handleSupabaseError(err, "ArticleManager: Failed to fetch articles");
        return [];
      }
    },
    retry: 1,
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCTS_COLUMNS.join(","))
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: articleProducts } = useQuery({
    queryKey: ["articleProducts", editingArticle?.id],
    queryFn: async () => {
      if (!editingArticle?.id) return [];
      const { data, error } = await supabase
        .from("article_products")
        .select("product_id")
        .eq("article_id", editingArticle.id);
      if (error) throw error;
      return data.map(ap => ap.product_id);
    },
    enabled: !!editingArticle?.id,
  });

  useEffect(() => {
    if (articleProducts) {
      setSelectedProducts(articleProducts);
    }
  }, [articleProducts]);

  const createMutation = useMutation({
    mutationFn: async (values: ArticleFormValues) => {
      const { data, error } = await supabase.from("articles").insert({
        title: values.title,
        excerpt: values.excerpt,
        content: values.content,
        category: toArticleCategory(values.category),
        image: values.image,
        category_label: values.category_label || null,
        author: values.author,
        featured: values.featured,
        published: values.published,
        source_url: values.source_url || null,
        source_site: values.source_site || null,
        slug:
          values.slug?.trim() ||
          values.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now(),
        read_time: values.read_time || "5 min read",
        meta_title: values.meta_title || null,
        meta_description: values.meta_description || null,
        og_image: values.og_image || null,
      }).select("id").single();
      if (error) throw error;

      if (selectedProducts.length > 0 && data?.id) {
        const { error: linkError } = await supabase
          .from("article_products")
          .insert(selectedProducts.map(productId => ({
            article_id: data.id,
            product_id: productId,
          })));
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      setIsOpen(false);
      reset();
      setSelectedProducts([]);
      toast.success("Article created successfully");
    },
    onError: (error) => {
      toast.error(`Error creating article: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: ArticleFormValues) => {
      const { error } = await supabase
        .from("articles")
        .update({
          title: values.title,
          slug: values.slug?.trim() || editingArticle!.slug,
          excerpt: values.excerpt,
          content: values.content,
          category: toArticleCategory(values.category),
          image: values.image,
          category_label: values.category_label || null,
          author: values.author,
          read_time: values.read_time || null,
          featured: values.featured,
          published: values.published,
          source_url: values.source_url || null,
          source_site: values.source_site || null,
          meta_title: values.meta_title || null,
          meta_description: values.meta_description || null,
          og_image: values.og_image || null,
        })
        .eq("id", editingArticle!.id);
      if (error) throw error;

      if (editingArticle?.id) {
        const { error: deleteError } = await supabase
          .from("article_products")
          .delete()
          .eq("article_id", editingArticle.id);
        if (deleteError) throw deleteError;

        if (selectedProducts.length > 0) {
          const { error: linkError } = await supabase
            .from("article_products")
            .insert(selectedProducts.map(productId => ({
              article_id: editingArticle.id,
              product_id: productId,
            })));
          if (linkError) throw linkError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      setIsOpen(false);
      setEditingArticle(null);
      reset();
      setSelectedProducts([]);
      toast.success("Article updated successfully");
    },
    onError: (error) => {
      toast.error(`Error updating article: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success("Article deleted successfully");
    },
    onError: (error) => {
      toast.error(`Error deleting article: ${error.message}`);
    },
  });

  const onSubmit = (values: ArticleFormValues) => {
    if (editingArticle) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (article: ArticleRow) => {
    setEditingArticle(article);
    setValue("title", article.title);
    setValue("slug", article.slug || "");
    setValue("excerpt", article.excerpt || "");
    setValue("content", article.content || "");
    setValue("category", article.category);
    setValue("image", article.image || "");
    setUploadedImages(article.image ? [article.image] : []);
    setValue("category_label", article.category_label || "");
    setValue("author", article.author || "Admin");
    setValue("read_time", article.read_time || "5 min read");
    setValue("source_url", article.source_url || "");
    setValue("source_site", article.source_site || "");
    setValue("featured", article.featured || false);
    setValue("published", article.published !== false);
    setValue("meta_title", (article as any).meta_title || "");
    setValue("meta_description", (article as any).meta_description || "");
    setValue("og_image", (article as any).og_image || "");
    setOgUploadedImages((article as any).og_image ? [(article as any).og_image] : []);
    setIsOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditingArticle(null);
      reset({
        featured: false,
        published: true,
        author: "Admin",
        category_label: "",
        read_time: "5 min read",
        slug: "",
        source_site: "gadgetbytenepal.com",
        source_url: "",
      });
      setUploadedImages([]);
      setOgUploadedImages([]);
      setSelectedProducts([]);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const existingDraft = localStorage.getItem("article-draft");
    if (existingDraft && !editingArticle) {
      try {
        const draft = JSON.parse(existingDraft) as Partial<ArticleFormValues>;
        if (draft.title) setValue("title", draft.title);
        if (draft.slug) setValue("slug", draft.slug);
        if (draft.excerpt) setValue("excerpt", draft.excerpt);
        if (draft.content) setValue("content", draft.content);
        if (draft.category) setValue("category", draft.category);
        if (draft.image) {
          setValue("image", draft.image);
          setUploadedImages([draft.image]);
        }
        if (draft.author) setValue("author", draft.author);
        if (draft.read_time) setValue("read_time", draft.read_time);
        if (draft.source_url) setValue("source_url", draft.source_url);
        if (draft.source_site) setValue("source_site", draft.source_site);
        if (draft.meta_title) setValue("meta_title", draft.meta_title);
        if (draft.meta_description) setValue("meta_description", draft.meta_description);
        if (draft.og_image) {
          setValue("og_image", draft.og_image);
          setOgUploadedImages([draft.og_image]);
        }
      } catch {
        // ignore
      }
    }
  }, [isOpen, editingArticle, setValue]);

  const persistDraft = () => {
    const formEl = document.querySelector<HTMLFormElement>("#article-form");
    if (!formEl) return;
    const formData = new FormData(formEl);
    const draft: Partial<ArticleFormValues> = {
      title: String(formData.get("title") || ""),
      slug: String(formData.get("slug") || ""),
      excerpt: String(formData.get("excerpt") || ""),
      content: String(formData.get("content") || ""),
      category: String(formData.get("category") || ""),
      image: String(formData.get("image") || ""),
      author: String(formData.get("author") || ""),
      read_time: String(formData.get("read_time") || ""),
      source_url: String(formData.get("source_url") || ""),
      source_site: String(formData.get("source_site") || ""),
      meta_title: String(formData.get("meta_title") || ""),
      meta_description: String(formData.get("meta_description") || ""),
      og_image: String(formData.get("og_image") || ""),
    };
    localStorage.setItem("article-draft", JSON.stringify(draft));
    toast.success("Draft saved locally");
  };

  const generateSlug = () => {
    const titleInput = document.getElementById("title") as HTMLInputElement | null;
    const title = titleInput?.value || "";
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "";
    setValue("slug", slug);
  };

  const autoExcerpt = () => {
    const contentInput = document.getElementById("content") as HTMLTextAreaElement | null;
    const content = contentInput?.value || "";
    const excerpt = content.replace(/\s+/g, " ").trim().slice(0, 220);
    setValue("excerpt", excerpt);
  };

  // Define the sample articles array once for reuse
  const iPhone18Articles: ArticleSeed[] = [
    {
      title: "iPhone 18 Series Leak: What We Know So Far",
      slug: "iphone-18-series-leak-news",
      excerpt: "Latest iPhone 18 series leak news, expected models, Pro features, possible Fold model, and what buyers should know before launch.",
      content: `<h2>iPhone 18 Series Leak: What We Know So Far</h2>
<p>Apple’s next big iPhone story is already building strong attention online. The iPhone 18 series has not been officially announced yet, but new reports and leaks have started giving early hints about what Apple may be preparing for its next generation.</p>
<p>The biggest news so far is connected to a reported Tata Electronics data leak. Reuters reported that confidential files connected to the unreleased iPhone 18 Pro were exposed, including supplier information, parts details, and internal test photos. This does not mean all leaked details are final, but it shows that Apple’s next Pro model is already deep inside the testing and supply-chain stage.</p>
<p>Reports also suggest Apple may change its launch strategy. The iPhone 18 Pro, iPhone 18 Pro Max, and a possible first foldable iPhone may arrive first, while the standard iPhone 18 and iPhone 18e could come later.</p>
<p>For buyers, the smart move is simple: wait for Apple’s official launch before making a final decision. Leaks are exciting, but final design, price, storage, camera, battery, and Nepal availability will only be clear after Apple confirms everything.</p>
<p>At Tamrakar Complex, customers should treat the iPhone 18 series as one of the most important upcoming Apple launches, especially for users planning to upgrade from iPhone 14, iPhone 15, or older models.</p>`,
      category: "news",
      category_label: "iPhone 18",
      image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80",
      meta_title: "iPhone 18 Series Leak: What We Know So Far - Nepal 2026",
      meta_description: "Latest iPhone 18 series leak news, expected models, Pro features, possible Fold model, and what buyers should know before launch in Nepal.",
      og_image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1200&q=80",
      author: "Tech News Team",
      read_time: "5 min read",
      source_url: "https://tamrakarcomplex.com/news",
      source_site: "tamrakarcomplex.com",
      featured: true,
      published: true,
    },
    {
      title: "iPhone 18 Pro Leak: Why the Tata Data Breach Matters",
      slug: "iphone-18-pro-tata-leak-explained",
      excerpt: "A reported Tata Electronics data breach may have exposed iPhone 18 Pro supplier and parts details. Here is why it matters.",
      content: `<h2>iPhone 18 Pro Leak: Why the Tata Data Breach Matters</h2>
<p>The iPhone 18 Pro is in the news because of a reported data breach involving Tata Electronics, one of Apple’s important manufacturing partners in India. Reuters reported that leaked files included supplier lists, component details, and photos related to iPhone 18 Pro testing.</p>
<p>This matters because Apple usually keeps its supply chain extremely private. Supplier names, part details, and internal testing data are highly sensitive. When such information appears before launch, it can create pressure for Apple, its manufacturing partners, and the wider smartphone industry.</p>
<p>For normal buyers, the leak does not mean the iPhone 18 Pro is confirmed exactly as shown in reports. Apple can still change final hardware, design, materials, and features before launch. However, leaks from supplier-level documents often give early signs of what Apple is testing.</p>
<p>The reported leak also shows India’s rising role in iPhone production. Tata Electronics has become part of Apple’s plan to expand manufacturing outside China, making India more important in the global Apple supply chain.</p>
<p>For Nepal’s mobile market, this is important because global production changes can affect launch timing, stock flow, and price. Customers waiting for the iPhone 18 Pro should follow official updates before booking or paying advance money.</p>`,
      category: "news",
      category_label: "iPhone 18",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
      meta_title: "iPhone 18 Pro Leak: Why the Tata Data Breach Matters - Nepal",
      meta_description: "A reported Tata Electronics data breach may have exposed iPhone 18 Pro supplier and parts details. Here is why it matters for Nepal buyers.",
      og_image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80",
      author: "Tech News Team",
      read_time: "4 min read",
      source_url: "https://tamrakarcomplex.com/news",
      source_site: "tamrakarcomplex.com",
      featured: true,
      published: true,
    },
    {
      title: "iPhone 18 Pro Drop Test Leak: Stronger Design or Same Look?",
      slug: "iphone-18-pro-drop-test-leak",
      excerpt: "Reported iPhone 18 Pro drop test videos and photos have appeared online. Here is what they may mean for design and durability.",
      content: `<h2>iPhone 18 Pro Drop Test Leak: Stronger Design or Same Look?</h2>
<p>The iPhone 18 Pro has reportedly appeared in leaked drop-test photos and videos connected to the Tata Electronics data breach. The Verge reported that videos allegedly showing iPhone 18 Pro drop testing were posted on X and later removed.</p>
<p>Drop testing is a normal part of smartphone development. Before a phone reaches customers, brands test how the device performs against falls, pressure, bending, heat, and daily-use damage. If the leaked iPhone 18 Pro material is real, it means Apple is already testing durability for its next Pro model.</p>
<p>Early reports mention a device with a familiar premium iPhone look and a triple-camera setup. But buyers should be careful: leaked test units do not always match the final retail version. Apple may test many body types, materials, and internal layouts before choosing the final design.</p>
<p>The real question is whether Apple will focus on a completely new design or a stronger version of the current Pro design language. For many users, durability matters more than a dramatic visual change. A stronger body, better glass, improved frame, and better heat control could be more useful than a new look only for show.</p>
<p>Until Apple announces it officially, the safest headline is: iPhone 18 Pro may bring durability improvements, but final design is still not confirmed.</p>`,
      category: "news",
      category_label: "iPhone 18",
      image: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&q=80",
      meta_title: "iPhone 18 Pro Drop Test Leak: Stronger Design or Same Look?",
      meta_description: "Reported iPhone 18 Pro drop test videos and photos have appeared online. Here is what they may mean for design and durability in Nepal.",
      og_image: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=1200&q=80",
      author: "Tech News Team",
      read_time: "5 min read",
      source_url: "https://tamrakarcomplex.com/news",
      source_site: "tamrakarcomplex.com",
      featured: true,
      published: true,
    },
    {
      title: "iPhone 18 Series Launch Timeline: Pro First, Standard Later?",
      slug: "iphone-18-series-launch-timeline",
      excerpt: "Apple may split the iPhone 18 launch timeline, with Pro and Fold models expected first and standard models possibly later.",
      content: `<h2>iPhone 18 Series Launch Timeline: Pro First, Standard Later?</h2>
<p>One of the most interesting iPhone 18 rumors is Apple’s possible launch timing change. According to MacRumors, Apple may launch the iPhone 18 Pro, iPhone 18 Pro Max, and the first foldable iPhone in fall 2026, while the standard iPhone 18 and iPhone 18e may arrive in spring 2027.</p>
<p>This would be a major change from Apple’s normal iPhone launch pattern. Usually, Apple introduces the full iPhone lineup together. A split launch could help Apple give more focus to premium models first, especially if the foldable iPhone is also ready.</p>
<p>For customers, this means the iPhone 18 series may not arrive as one simple family at the same time. Buyers who want the best camera, fastest chip, and most premium features may look toward the iPhone 18 Pro and Pro Max first. Budget-focused buyers may need to wait longer for the regular iPhone 18.</p>
<p>For Nepal’s market, launch timing is very important. New iPhones usually arrive first in major global markets, then slowly become available in Nepal through official and retail channels. If Apple splits the lineup, Nepal customers may also see different availability dates for different models.</p>
<p>The key advice is clear: do not trust random “available now” posts before Apple’s official event. Real availability should be checked through trusted sellers only.</p>`,
      category: "news",
      category_label: "iPhone 18",
      image: "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800&q=80",
      meta_title: "iPhone 18 Series Launch Timeline: Pro First, Standard Later?",
      meta_description: "Apple may split the iPhone 18 launch timeline, with Pro and Fold models expected first and standard models possibly later for Nepal market.",
      og_image: "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1200&q=80",
      author: "Tech News Team",
      read_time: "5 min read",
      source_url: "https://tamrakarcomplex.com/news",
      source_site: "tamrakarcomplex.com",
      featured: true,
      published: true,
    },
    {
      title: "iPhone 18 Pro A20 Chip: Why 2nm Technology Could Matter",
      slug: "iphone-18-pro-a20-chip-2nm",
      excerpt: "The iPhone 18 Pro and future foldable iPhone may use Apple’s A20 chip with 2nm technology. Here is why that matters.",
      content: `<h2>iPhone 18 Pro A20 Chip: Why 2nm Technology Could Matter</h2>
<p>The iPhone 18 generation may bring one of Apple’s biggest chip upgrades in years. Reports suggest Apple’s next A20 chip could be built on TSMC’s 2nm process, which may improve performance and battery efficiency compared with older chips.</p>
<p>For normal users, “2nm” simply means the chip may become more advanced. A better chip can help the phone run faster, use less power, handle gaming better, improve camera processing, and support stronger AI features.</p>
<p>Apple’s Pro models already focus heavily on camera, video, gaming, and long-term performance. If the iPhone 18 Pro gets the A20 Pro chip, it may become a strong upgrade for creators, mobile gamers, business users, and people who keep their phone for many years.</p>
<p>The chip upgrade may also matter for Apple Intelligence. AI features need strong processing power, memory, and efficiency. A more advanced chip could help future iPhones run smarter tools directly on the device.</p>
<p>Still, customers should remember that chip details are not official yet. Apple will confirm the real chip name, performance, and features only during its launch event.</p>
<p>For Tamrakar Complex buyers, this is a good reason to wait if you already own an iPhone 15 Pro or newer. But if you use an older iPhone, the iPhone 18 Pro could be a major jump.</p>`,
      category: "news",
      category_label: "iPhone 18",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
      meta_title: "iPhone 18 Pro A20 Chip: Why 2nm Technology Could Matter - Nepal",
      meta_description: "The iPhone 18 Pro and future foldable iPhone may use Apple’s A20 chip with 2nm technology. Here is why that matters for Nepal buyers.",
      og_image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
      author: "Tech News Team",
      read_time: "5 min read",
      source_url: "https://tamrakarcomplex.com/news",
      source_site: "tamrakarcomplex.com",
      featured: true,
      published: true,
    },
    {
      title: "iPhone Fold or iPhone Ultra: Apple’s Biggest New Model?",
      slug: "iphone-fold-iphone-ultra-18-series",
      excerpt: "Apple may introduce its first foldable iPhone with the iPhone 18 generation. Here is what buyers should expect.",
      content: `<h2>iPhone Fold or iPhone Ultra: Apple’s Biggest New Model?</h2>
<p>The iPhone 18 generation may be special because Apple is rumored to introduce its first foldable iPhone. Reports suggest the foldable iPhone could launch alongside the iPhone 18 Pro models instead of the standard iPhone 18.</p>
<p>A foldable iPhone would be a big moment for Apple. Samsung, Google, OnePlus, and other brands already have foldable phones in the market, but Apple has waited longer. That means expectations will be very high.</p>
<p>The foldable iPhone may focus on a premium experience: larger screen, better multitasking, strong build quality, and deep iOS optimization. It may not be for every buyer because foldable phones are usually expensive and delicate compared with normal smartphones.</p>
<p>For Nepal, the first foldable iPhone could become a high-demand luxury device. It may attract business owners, creators, tech lovers, and Apple collectors. But customers should also think about repair cost, screen protection, hinge durability, and resale value.</p>
<p>The name is still not confirmed. Some reports call it iPhone Fold, while others discuss Ultra-style branding. Apple may choose a completely different name at launch.</p>
<p>The simple truth is this: if Apple enters the foldable market, the iPhone 18 generation will become one of the most important iPhone launches in years.</p>`,
      category: "news",
      category_label: "iPhone 18",
      image: "https://images.unsplash.com/photo-1617802690992-15d9c25c662b?w=800&q=80",
      meta_title: "iPhone Fold or iPhone Ultra: Apple’s Biggest New Model? - Nepal",
      meta_description: "Apple may introduce its first foldable iPhone with the iPhone 18 generation. Here is what Nepal buyers should expect.",
      og_image: "https://images.unsplash.com/photo-1617802690992-15d9c25c662b?w=1200&q=80",
      author: "Tech News Team",
      read_time: "5 min read",
      source_url: "https://tamrakarcomplex.com/news",
      source_site: "tamrakarcomplex.com",
      featured: true,
      published: true,
    },
    {
      title: "iPhone 18 Pro Max Price Rumors: Will It Become More Expensive?",
      slug: "iphone-18-pro-max-price-rumor",
      excerpt: "The iPhone 18 Pro Max may become more expensive, according to early analyst reports. Here is what buyers should know.",
      content: `<h2>iPhone 18 Pro Max Price Rumors: Will It Become More Expensive?</h2>
<p>The iPhone 18 Pro Max may become one of Apple’s most expensive iPhones yet, according to recent price-rumor reports. MacRumors reported that Apple’s iPhone 18 Pro models could see a price increase, with some estimates pointing toward a rise of up to $200.</p>
<p>Tom’s Guide also reported analyst expectations of a possible major price jump for Apple’s next flagship model.</p>
<p>There are many possible reasons behind price pressure. New chip technology, advanced camera parts, memory costs, AI-related hardware, premium materials, and global supply-chain expenses can all affect final pricing.</p>
<p>For Nepal buyers, this matters even more. International price increases usually become bigger in the local market after import cost, tax, warranty, exchange rate, and retailer margin. So even a small global price rise can feel much larger in Nepal.</p>
<p>However, Apple has not confirmed iPhone 18 pricing. Customers should avoid believing fixed prices posted too early on social media. Any “official price” before Apple’s launch should be treated carefully.</p>
<p>A smart buyer should compare three things before upgrading: current iPhone condition, expected iPhone 18 price, and resale value of the old phone. If the iPhone 18 Pro Max becomes much more expensive, the iPhone 17 Pro Max or iPhone 16 Pro Max may still remain strong value options.</p>`,
      category: "news",
      category_label: "iPhone 18",
      image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
      meta_title: "iPhone 18 Pro Max Price Rumors: Will It Become More Expensive? - Nepal",
      meta_description: "The iPhone 18 Pro Max may become more expensive, according to early analyst reports. Here is what Nepal buyers should know.",
      og_image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&q=80",
      author: "Tech News Team",
      read_time: "5 min read",
      source_url: "https://tamrakarcomplex.com/news",
      source_site: "tamrakarcomplex.com",
      featured: true,
      published: true,
    },
    {
      title: "iPhone 18 Pro Camera and Battery Leak: What It Could Mean",
      slug: "iphone-18-pro-camera-battery-leak",
      excerpt: "Reported iPhone 18 Pro leaked documents mention camera, battery, and component details. Here is what buyers should understand.",
      content: `<h2>iPhone 18 Pro Camera and Battery Leak: What It Could Mean</h2>
<p>The reported iPhone 18 Pro leak includes details connected to cameras, batteries, boards, and other internal parts, according to Reuters.</p>
<p>This does not confirm the final camera megapixels, zoom range, or battery size. But it does suggest Apple is already testing key hardware parts for the iPhone 18 Pro.</p>
<p>For buyers, camera and battery are two of the most important upgrade points. Every year, Apple tries to improve photo quality, video recording, low-light performance, portrait shots, and image processing. The Pro models usually get the best camera system first.</p>
<p>Battery performance is also very important. A powerful chip is useful only if the phone can stay cool and last long. If the iPhone 18 Pro uses a more efficient chip and improved internal design, users may see better real-life battery experience.</p>
<p>Still, leaks should be treated carefully. Supplier documents may show test parts, not final retail parts. Apple can test multiple camera modules and battery designs before choosing the final version.</p>
<p>For Tamrakar Complex customers, the best advice is to wait for real camera samples and battery tests after launch. Do not buy only because of early leak headlines. Buy after checking real performance, warranty, and local price.</p>`,
      category: "news",
      category_label: "iPhone 18",
      image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
      meta_title: "iPhone 18 Pro Camera and Battery Leak: What It Could Mean - Nepal",
      meta_description: "Reported iPhone 18 Pro leaked documents mention camera, battery, and component details. Here is what Nepal buyers should understand.",
      og_image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&q=80",
      author: "Tech News Team",
      read_time: "5 min read",
      source_url: "https://tamrakarcomplex.com/news",
      source_site: "tamrakarcomplex.com",
      featured: true,
      published: true,
    },
    {
      title: "Should You Wait for iPhone 18 or Buy iPhone 17 Now?",
      slug: "wait-for-iphone-18-or-buy-iphone-17",
      excerpt: "Should you wait for iPhone 18 or buy iPhone 17 now? Here is a simple buying guide for Nepal customers.",
      content: `<h2>Should You Wait for iPhone 18 or Buy iPhone 17 Now?</h2>
<p>Many customers are now asking one simple question: should I wait for iPhone 18 or buy iPhone 17 now?</p>
<p>The answer depends on your current phone. If you are using iPhone 11, iPhone 12, or iPhone 13, upgrading to iPhone 17 can still feel like a big jump. You get better display, camera, battery, performance, and software support.</p>
<p>But if you are using iPhone 15 Pro, iPhone 16 Pro, or iPhone 17 Pro, waiting for iPhone 18 may make more sense. Reports suggest the iPhone 18 Pro generation may bring the A20 chip, possible new premium models, and a major focus on Pro hardware.</p>
<p>Price is the biggest risk. Early reports suggest the iPhone 18 Pro models may become more expensive. If that happens, many buyers may choose iPhone 17 Pro or iPhone 17 Pro Max as better value options.</p>
<p>In Nepal, the best buying strategy is simple. If you need a phone now, buy a trusted model with warranty. If your current phone still works well, wait for Apple’s official iPhone 18 announcement.</p>
<p>Do not rush because of leaks. A smart buyer waits for official specs, real reviews, battery tests, camera samples, and local price.</p>`,
      category: "guide",
      category_label: "iPhone 18",
      image: "https://images.unsplash.com/photo-1592286927501-290561327850?w=800&q=80",
      meta_title: "Should You Wait for iPhone 18 or Buy iPhone 17 Now? - Nepal Buying Guide",
      meta_description: "Should you wait for iPhone 18 or buy iPhone 17 now? Here is a simple buying guide for Nepal customers at Tamrakar Complex.",
      og_image: "https://images.unsplash.com/photo-1592286927501-290561327850?w=1200&q=80",
      author: "Buying Guide Team",
      read_time: "4 min read",
      source_url: "https://tamrakarcomplex.com/guides",
      source_site: "tamrakarcomplex.com",
      featured: true,
      published: true,
    },
    {
      title: "iPhone 18 Pre-Order Safety Guide for Nepal Buyers",
      slug: "iphone-18-preorder-safety-nepal",
      excerpt: "Planning to pre-order iPhone 18 in Nepal? Read this safety guide before paying advance money.",
      content: `<h2>iPhone 18 Pre-Order Safety Guide for Nepal Buyers</h2>
<p>The iPhone 18 series is already creating strong hype, but buyers in Nepal should be careful before placing any pre-order. Apple has not officially announced the iPhone 18 yet, and the current Apple iPhone page still focuses on the iPhone 17 lineup.</p>
<p>This means any iPhone 18 booking before Apple’s event should be handled carefully. Some sellers may use leaked news, fake posters, or edited images to create pressure. Customers should never pay advance money without clear seller identity, written booking terms, refund policy, and expected delivery details.</p>
<p>A safe pre-order should include model name, storage option, color choice, estimated price range, warranty type, delivery timing, and refund condition. Buyers should also confirm whether the phone is official warranty, international warranty, or shop warranty.</p>
<p>The iPhone 18 Pro, iPhone 18 Pro Max, and possible foldable iPhone may arrive first, according to current reports. The standard iPhone 18 may come later. This is why buyers should not assume all models will be available at the same time.</p>
<p>At Tamrakar Complex, customers should choose trusted shops only. Ask for proper bill, IMEI details, warranty information, and clear payment proof.</p>
<p>Leaks create excitement. Official launch creates truth. Wait for confirmation, then book smartly.</p>`,
      category: "guide",
      category_label: "iPhone 18",
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
      meta_title: "iPhone 18 Pre-Order Safety Guide for Nepal Buyers - Tamrakar Complex",
      meta_description: "Planning to pre-order iPhone 18 in Nepal? Read this safety guide before paying advance money at Tamrakar Complex stores.",
      og_image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80",
      author: "Buying Guide Team",
      read_time: "4 min read",
      source_url: "https://tamrakarcomplex.com/guides",
      source_site: "tamrakarcomplex.com",
      featured: true,
      published: true,
    },
  ];

  const techPanaGadgetArticles: ArticleSeed[] = [
    {
      title: "Vivo Y500 in Nepal: What Budget Buyers Should Check First",
      slug: "vivo-y500-nepal-budget-buying-guide",
      excerpt: "Vivo Y500 has entered Nepal's budget smartphone conversation. Here is what buyers should check before choosing it over Samsung, Redmi, Realme, or Oppo alternatives.",
      content: `<h2>Vivo Y500 in Nepal: What Budget Buyers Should Check First</h2>
<p>Vivo's Y-series phones are popular in Nepal because they usually focus on battery life, everyday design, camera styling, and easy availability. The Vivo Y500 topic is now gaining attention among budget buyers, especially people comparing new phones for calls, social media, photos, online classes, and light gaming.</p>
<p>Before buying any new Vivo Y-series phone, the first thing to check is the exact variant. Storage and RAM can change the real user experience more than the model name. A phone with enough storage will feel useful for longer, especially if you use TikTok, Facebook, YouTube, camera, and messaging apps every day.</p>
<p>The second important point is display and battery. Budget buyers in Nepal often keep a phone for two to four years, so a bright display, comfortable size, and strong battery matter more than a headline feature. Also check charging speed and whether the charger is included in the box.</p>
<p>Camera performance should be tested in-store if possible. Take one photo indoors, one portrait, and one low-light shot. Many phones look strong on paper but behave differently in real shops and homes.</p>
<p>If you are buying from Tamrakar Complex or any mobile market, ask for warranty type, bill, return condition, and available colors. Compare it with Redmi, Realme, Samsung M-series, and Oppo A-series models in the same price range before deciding.</p>`,
      category: "guide",
      category_label: "Vivo",
      image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80",
      meta_title: "Vivo Y500 Nepal Buying Guide - Budget Phone Checks",
      meta_description: "Original Vivo Y500 Nepal buying guide with checks for storage, battery, camera, warranty, and alternatives before buying.",
      og_image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=1200&q=80",
      author: "Gadget Desk",
      read_time: "4 min read",
      source_url: "https://techpana.com/category/gadgets",
      source_site: "techpana.com",
      featured: false,
      published: true,
    },
    {
      title: "CG AI Plus 5G Phone: Nepal's Entry 5G Market Is Getting Serious",
      slug: "cg-ai-plus-5g-phone-nepal-entry-market",
      excerpt: "CG's AI Plus 5G phone topic shows how Nepal's affordable 5G segment is growing. Here is what buyers should understand before choosing a low-cost 5G device.",
      content: `<h2>CG AI Plus 5G Phone: Nepal's Entry 5G Market Is Getting Serious</h2>
<p>Affordable 5G phones are becoming more important in Nepal. The CG AI Plus 5G topic is interesting because it points toward a future where 5G is not limited to expensive flagship phones.</p>
<p>For buyers, the main question is not only whether the phone supports 5G. You should also check processor quality, battery size, software update promise, display refresh rate, camera performance, and service-center support. A phone with 5G but weak overall hardware may not feel better than a strong 4G phone at the same price.</p>
<p>Network availability is another practical point. 5G coverage in Nepal is still not equally available everywhere, so customers should buy based on their real location and usage. If you mostly use Wi-Fi, a better display and battery may matter more than 5G alone.</p>
<p>Entry-level 5G phones are best for users who keep phones for several years and want future-ready connectivity. Students, delivery workers, creators, and heavy social media users may benefit if the phone also has good storage and thermal control.</p>
<p>Before paying, compare CG's offer with Redmi, Samsung, Realme, and Vivo devices around the same budget. Ask about warranty, spare parts, repair support, exchange value, and whether the phone is official stock.</p>`,
      category: "guide",
      category_label: "5G Phones",
      image: "https://images.unsplash.com/photo-1616410011236-7a42121dd981?w=800&q=80",
      meta_title: "CG AI Plus 5G Phone Nepal - Entry 5G Buying Guide",
      meta_description: "Original Nepal-focused guide on affordable 5G phones, CG AI Plus 5G, warranty, network coverage, and buying checks.",
      og_image: "https://images.unsplash.com/photo-1616410011236-7a42121dd981?w=1200&q=80",
      author: "Gadget Desk",
      read_time: "5 min read",
      source_url: "https://techpana.com/category/gadgets",
      source_site: "techpana.com",
      featured: true,
      published: true,
    },
    {
      title: "Oppo Find N5 in Nepal: Foldable Phone or Premium Experiment?",
      slug: "oppo-find-n5-nepal-foldable-buying-guide",
      excerpt: "Oppo Find N5 is a premium foldable topic for Nepal buyers. Here is how to judge display, hinge, warranty, repair cost, and long-term value.",
      content: `<h2>Oppo Find N5 in Nepal: Foldable Phone or Premium Experiment?</h2>
<p>Foldable phones are no longer only concept devices. Oppo's Find N-series has helped make book-style foldables thinner, more polished, and more practical for users who want a phone and mini tablet in one device.</p>
<p>For Nepal buyers, the Oppo Find N5 type of device should be judged differently from a normal flagship. The first thing to inspect is the hinge. Open and close the device several times, check if the motion feels smooth, and look for any uneven gap or display crease issue.</p>
<p>The inner display is the main attraction, but it is also the most sensitive part. Ask clearly about screen warranty, accidental damage policy, replacement cost, and whether local service support is available. Foldable repair can be much more expensive than regular phone repair.</p>
<p>Performance, camera, battery, and charging are also important, but the real value of a foldable comes from multitasking. If you read documents, manage business chats, watch videos, edit content, or use multiple apps together, a foldable can feel genuinely useful.</p>
<p>If you only want the best camera or gaming performance, a slab flagship may still be safer. Buy a foldable only if you understand both the premium experience and the higher ownership risk.</p>`,
      category: "guide",
      category_label: "Foldables",
      image: "https://images.unsplash.com/photo-1616410011236-7a42121dd981?w=800&q=80",
      meta_title: "Oppo Find N5 Nepal Foldable Buying Guide",
      meta_description: "Original guide for Oppo Find N5 and foldable phone buyers in Nepal, covering hinge, display, warranty, repair, and value.",
      og_image: "https://images.unsplash.com/photo-1616410011236-7a42121dd981?w=1200&q=80",
      author: "Gadget Desk",
      read_time: "5 min read",
      source_url: "https://techpana.com/category/gadgets",
      source_site: "techpana.com",
      featured: true,
      published: true,
    },
    {
      title: "Moto Edge 50 Fusion: Midrange Style Phone Buying Advice for Nepal",
      slug: "moto-edge-50-fusion-nepal-midrange-guide",
      excerpt: "Moto Edge 50 Fusion sits in a stylish midrange segment. Here is what Nepal buyers should check before choosing it over Redmi, Samsung, Nothing, or OnePlus.",
      content: `<h2>Moto Edge 50 Fusion: Midrange Style Phone Buying Advice for Nepal</h2>
<p>Motorola phones often stand out because of clean software, stylish design, and comfortable hardware. The Moto Edge 50 Fusion topic is useful for Nepal buyers who want a midrange phone that feels different from the usual Redmi, Samsung, Vivo, and Oppo options.</p>
<p>The main attraction of this type of phone is balance. A good midrange phone should have a smooth display, reliable processor, useful cameras, solid battery, and software that does not feel heavy. Motorola's cleaner Android experience can be a plus for users who dislike too many duplicate apps.</p>
<p>However, buyers should check availability and after-sales support carefully. A good phone is only a good purchase if warranty, spare parts, service, and resale support are practical in Nepal.</p>
<p>Camera expectations should also be realistic. Midrange phones can take excellent daylight photos, but low-light and video performance may differ from flagship models. Always compare sample photos before buying.</p>
<p>If you want a stylish daily phone with a clean feel, the Moto Edge 50 Fusion type of device can make sense. If your priority is long-term resale or easy repair everywhere, compare with Samsung and Redmi models before deciding.</p>`,
      category: "guide",
      category_label: "Motorola",
      image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80",
      meta_title: "Moto Edge 50 Fusion Nepal Buying Guide",
      meta_description: "Original Nepal buying guide for Moto Edge 50 Fusion-style midrange phones, covering display, software, support, camera, and value.",
      og_image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=1200&q=80",
      author: "Gadget Desk",
      read_time: "4 min read",
      source_url: "https://techpana.com/category/gadgets",
      source_site: "techpana.com",
      featured: false,
      published: true,
    },
    {
      title: "Redmi, Realme, Samsung or Vivo: Best Budget Phone Choice in Nepal",
      slug: "redmi-realme-samsung-vivo-budget-phone-nepal",
      excerpt: "Budget phone buyers in Nepal often compare Redmi, Realme, Samsung, and Vivo. This guide explains how to choose based on battery, display, camera, warranty, and resale.",
      content: `<h2>Redmi, Realme, Samsung or Vivo: Best Budget Phone Choice in Nepal</h2>
<p>Nepal's budget phone market is full of strong choices. Redmi usually competes with high specifications, Realme often focuses on performance and design, Samsung brings brand trust and software support, while Vivo is popular for retail availability, battery, and camera styling.</p>
<p>The best choice depends on your priority. If you want maximum specs for the price, compare Redmi and Realme first. If you care about software updates, service network, and resale confidence, Samsung deserves attention. If you prefer offline shopping, camera look, and easy availability, Vivo and Oppo are often worth checking.</p>
<p>Do not buy only by RAM number. Processor, storage type, display quality, battery health, software optimization, and warranty matter more in daily use. A phone with balanced hardware will feel better than a phone with one flashy specification.</p>
<p>For students and office users, battery and storage should be the first checks. For creators, camera and microphone quality matter. For gamers, processor and heat control are the key points.</p>
<p>Before buying in New Road or any local market, ask for official bill, warranty card, box seal, IMEI match, charger status, and exchange value. A slightly higher price from a trusted seller can be better than a cheap phone with unclear warranty.</p>`,
      category: "comparison",
      category_label: "Budget Phones",
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80",
      meta_title: "Redmi vs Realme vs Samsung vs Vivo Budget Phones Nepal",
      meta_description: "Original comparison guide for budget phone buyers in Nepal choosing between Redmi, Realme, Samsung, Vivo, and Oppo.",
      og_image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80",
      author: "Buying Guide Team",
      read_time: "5 min read",
      source_url: "https://techpana.com/category/gadgets",
      source_site: "techpana.com",
      featured: true,
      published: true,
    },
    {
      title: "Smartwatch Buying Guide Nepal: Fitness, Calls, Battery and Warranty",
      slug: "smartwatch-buying-guide-nepal-fitness-calls-battery",
      excerpt: "Smartwatches are popular in Nepal, but the right choice depends on fitness accuracy, Bluetooth calling, battery life, app support, and warranty.",
      content: `<h2>Smartwatch Buying Guide Nepal: Fitness, Calls, Battery and Warranty</h2>
<p>Smartwatches have become common accessories for students, office workers, fitness users, and everyday phone owners in Nepal. The market has everything from low-cost watches to premium Apple, Samsung, Huawei, Amazfit, and Noise-style devices.</p>
<p>The first decision is simple: do you need a real smartwatch or a fitness watch? A real smartwatch has stronger app support, notifications, call handling, and ecosystem features. A fitness watch usually gives longer battery life and simpler tracking.</p>
<p>Bluetooth calling is useful, but check speaker volume and microphone quality before buying. Many low-cost watches advertise calling, but call quality can be weak outdoors or in traffic.</p>
<p>Battery life is another major point. Premium smartwatches may need charging every one or two days, while fitness-focused watches can last a week or more. Choose based on your routine, not only brand name.</p>
<p>For Nepal buyers, warranty and app compatibility are very important. Make sure the watch connects properly with your Android or iPhone, supports the health features you need, and has service support if the strap, charger, or display fails.</p>`,
      category: "guide",
      category_label: "Smartwatch",
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
      meta_title: "Smartwatch Buying Guide Nepal - Fitness, Calls, Battery",
      meta_description: "Original smartwatch buying guide for Nepal covering fitness tracking, Bluetooth calls, battery life, app support, and warranty.",
      og_image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=80",
      author: "Gadget Desk",
      read_time: "4 min read",
      source_url: "https://techpana.com/category/gadgets",
      source_site: "techpana.com",
      featured: false,
      published: true,
    },
  ];

  // Mutation specifically for seeding iPhone 18 articles
  const seedArticlesMutation = useMutation({
    mutationFn: async () => {
      const payloads = iPhone18Articles.map((a) => ({
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        content: a.content,
        category: toArticleCategory(a.category),
        category_label: a.category_label || null,
        image: a.image,
        author: a.author || "Admin",
        read_time: a.read_time || "5 min read",
        source_url: a.source_url || null,
        source_site: a.source_site || null,
        featured: a.featured ?? false,
        published: a.published ?? true,
        meta_title: a.meta_title || null,
        meta_description: a.meta_description || null,
        og_image: a.og_image || null,
      }));

      const { error: upsertError } = await supabase
        .from("articles")
        .upsert(payloads, { onConflict: "slug" });
      if (upsertError) throw upsertError;

      return { inserted: payloads.length, skipped: 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success(`Successfully seeded ${data?.inserted ?? 0} iPhone 18 articles!`);
    },
    onError: (error) => {
      toast.error(`Failed to seed articles: ${error.message}`);
    },
  });

  const seedTechPanaGadgetMutation = useMutation({
    mutationFn: async () => {
      const payloads = techPanaGadgetArticles.map((a) => ({
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        content: a.content,
        category: toArticleCategory(a.category),
        category_label: a.category_label || null,
        image: a.image,
        author: a.author || "Gadget Desk",
        read_time: a.read_time || "5 min read",
        source_url: a.source_url || "https://techpana.com/category/gadgets",
        source_site: a.source_site || "techpana.com",
        featured: a.featured ?? false,
        published: a.published ?? true,
        meta_title: a.meta_title || null,
        meta_description: a.meta_description || null,
        og_image: a.og_image || null,
      }));

      const { error: upsertError } = await supabase
        .from("articles")
        .upsert(payloads, { onConflict: "slug" });
      if (upsertError) throw upsertError;

      return { inserted: payloads.length, skipped: 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success(`Seeded ${data?.inserted ?? 0} rewritten TechPana gadget-topic articles.`);
    },
    onError: (error) => {
      toast.error(`Failed to seed TechPana gadget articles: ${error.message}`);
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      try {
        await assertEdgeFunctionAvailable("import-gadgetbyte-articles");
        const { data, error } = await supabase.functions.invoke("import-gadgetbyte-articles", {
          body: {
            sitemapUrl: importUrl,
            limit: importLimit,
          },
        });
        if (error) throw error;
        return data as { inserted?: number; skipped?: number; parsed?: number; sitemapUrl?: string };
      } catch (err) {
        // Fallback to iPhone 18 articles
        const payloads = iPhone18Articles.map((a) => ({
          title: a.title,
          slug: a.slug,
          excerpt: a.excerpt,
          content: a.content,
          category: toArticleCategory(a.category),
          category_label: a.category_label || null,
          image: a.image,
          author: a.author || "Admin",
          read_time: a.read_time || "5 min read",
          source_url: a.source_url || null,
          source_site: a.source_site || null,
          featured: a.featured ?? false,
          published: a.published ?? true,
          meta_title: a.meta_title || null,
          meta_description: a.meta_description || null,
          og_image: a.og_image || null,
        }));

        const { error: upsertError } = await supabase
          .from("articles")
          .upsert(payloads, { onConflict: "slug" });
        if (upsertError) throw upsertError;

        return { inserted: payloads.length, skipped: 0, parsed: payloads.length, sitemapUrl: "fallback-seed" };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      setIsImportOpen(false);
      toast.success(`Imported ${data?.inserted ?? 0} articles (skipped ${data?.skipped ?? 0}).`);
    },
    onError: (error) => {
      toast.error(`Import failed: ${formatEdgeFunctionError(error)}`);
    },
  });

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredArticles = (articles || [])
    .filter((article) =>
      article.title.toLowerCase().includes(search.toLowerCase())
    )
    .filter((article) => 
      selectedCategory === "All" ? true : article.category === selectedCategory
    )
    .filter((article) => {
      if (selectedStatus === "All") return true;
      if (selectedStatus === "Published") return article.published !== false;
      if (selectedStatus === "Draft") return article.published === false;
      if (selectedStatus === "Featured") return article.featured === true;
      return true;
    })
    .sort((a, b) => {
        if (sortConfig.key === "sn") {
             return sortConfig.direction === "asc" 
                ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }

        const aValue = a[sortConfig.key as keyof ArticleRow];
        const bValue = b[sortConfig.key as keyof ArticleRow];

        if (aValue === bValue) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        if (typeof aValue === "string" && typeof bValue === "string") {
            return sortConfig.direction === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedArticles = filteredArticles.slice(startIndex, startIndex + pageSize);

  const categories = Array.from(new Set((articles || []).map((a) => a.category).filter((c): c is string => typeof c === "string"))).sort();

  const filteredProducts = (products || []).filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectedProductDetails = (products || []).filter(p => selectedProducts.includes(p.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={seedArticlesMutation.isPending}
            onClick={() => seedArticlesMutation.mutate()}
          >
            {seedArticlesMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Seed iPhone 18 Articles
          </Button>
          <Button
            variant="outline"
            disabled={seedTechPanaGadgetMutation.isPending}
            onClick={() => seedTechPanaGadgetMutation.mutate()}
          >
            {seedTechPanaGadgetMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Seed TechPana Gadget Topics
          </Button>
          
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Import Sitemap
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Import Articles</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="articles_sitemap_url">Sitemap URL</Label>
                  <Input
                    id="articles_sitemap_url"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="articles_import_limit">Limit</Label>
                  <Input
                    id="articles_import_limit"
                    type="number"
                    value={importLimit}
                    onChange={(e) => setImportLimit(Number(e.target.value))}
                  />
                </div>
                <Button className="w-full" disabled={importMutation.isPending} onClick={() => importMutation.mutate()}>
                  {importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Import
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Article
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[1200px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingArticle ? "Edit Article" : "Add Article"}</DialogTitle>
              </DialogHeader>
              <form id="article-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" {...register("title", { required: true })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" {...register("slug")} />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={generateSlug}>
                      Generate Slug
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={persistDraft}>
                      Save Draft (Local)
                    </Button>
                    <Button
                      type="button"
                      variant={showPreview ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setShowPreview((v) => !v)}
                    >
                      {showPreview ? "Hide Preview" : "Show Preview"}
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formValues.category || "news"} 
                    onValueChange={(val) => setValue("category", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="news">News</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="guide">Guide</SelectItem>
                      <SelectItem value="comparison">Comparison</SelectItem>
                      <SelectItem value="price">Price</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="laptop">Laptop</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="watch">Watch</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* SEO Section */}
                <div className="space-y-4 border rounded-lg p-4">
                  <h3 className="text-lg font-semibold">SEO Settings</h3>
                  <div className="grid gap-2">
                    <Label htmlFor="meta_title">Meta Title</Label>
                    <Input id="meta_title" {...register("meta_title")} placeholder="SEO title" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="meta_description">Meta Description</Label>
                    <Textarea id="meta_description" {...register("meta_description")} placeholder="SEO description" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="og_image">OG Image</Label>
                    <ImageUpload
                      value={ogUploadedImages}
                      onChange={(val) => {
                        setOgUploadedImages(val);
                        if (val[0]) setValue("og_image", val[0]);
                      }}
                    />
                    <Input id="og_image" type="hidden" {...register("og_image")} />
                  </div>
                </div>

                {/* Product Linking */}
                <div className="space-y-4 border rounded-lg p-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Linked Products
                  </h3>
                  <Input
                    placeholder="Search products to link..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    {selectedProductDetails.map(product => (
                      <Badge key={product.id} variant="secondary" className="flex items-center gap-2 px-3 py-1">
                        {product.name}
                        <button
                          type="button"
                          onClick={() => toggleProduct(product.id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleProduct(product.id)}
                        className={`p-2 text-left text-sm rounded border transition-colors ${
                          selectedProducts.includes(product.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        {product.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea id="excerpt" {...register("excerpt")} />
                  <Button type="button" variant="outline" size="sm" onClick={autoExcerpt}>
                    Auto Generate from Content
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea id="content" {...register("content")} className="min-h-[200px]" />
                </div>
                <div className="grid gap-2">
                  <Label>Featured Image</Label>
                  <ImageUpload
                    value={uploadedImages}
                    onChange={(val) => {
                      setUploadedImages(val);
                      if (val[0]) setValue("image", val[0]);
                    }}
                  />
                  <Input id="image" type="hidden" {...register("image")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="author">Author</Label>
                    <Input id="author" {...register("author")} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="read_time">Read Time</Label>
                    <Input id="read_time" {...register("read_time")} placeholder="5 min read" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="source_url">Source URL</Label>
                    <Input id="source_url" {...register("source_url")} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="source_site">Source Site</Label>
                    <Input id="source_site" {...register("source_site")} />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="featured"
                      checked={formValues.featured}
                      onCheckedChange={(checked) => setValue("featured", checked as boolean)}
                    />
                    <Label htmlFor="featured">Featured</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="published"
                      checked={formValues.published}
                      onCheckedChange={(checked) => setValue("published", checked as boolean)}
                    />
                    <Label htmlFor="published">Published</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {editingArticle ? "Update Article" : "Create Article"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Published">Published</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Featured">Featured</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">SN</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("title")}>
                Title <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("category")}>
                Category <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("author")}>
                Author <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("published")}>
                Status <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("created_at")}>
                Date <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </TableHead>
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
            ) : pagedArticles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  No articles found
                </TableCell>
              </TableRow>
            ) : (
              pagedArticles.map((article, index) => (
                <TableRow key={article.id}>
                  <TableCell className="font-medium">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {article.featured && <Badge variant="secondary">Featured</Badge>}
                      {article.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{article.category}</Badge>
                    {article.category_label && ` (${article.category_label})`}
                  </TableCell>
                  <TableCell>{article.author}</TableCell>
                  <TableCell>
                    {article.published ? (
                      <Badge variant="default" className="bg-green-600">Published</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell>{new Date(article.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/stores/article/${article.slug}`} target="_blank">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(article)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this article?")) {
                            deleteMutation.mutate(article.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  onClick={() => setPage(pageNum)}
                  isActive={pageNum === currentPage}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default ArticleManager;
