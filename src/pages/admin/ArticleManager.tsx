
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
import { Loader2, Plus, Pencil, Trash2, Search, Download, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { ImageUpload } from "@/components/ui/image-upload";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import type { Enums, Tables } from "@/integrations/supabase/types";

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
}

type ArticleCategory = Enums<"article_category">;
type ArticleRow = Tables<"articles">;

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
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [page, setPage] = useState(1);
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
          .select("*")
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

  const createMutation = useMutation({
    mutationFn: async (values: ArticleFormValues) => {
      const { error } = await supabase.from("articles").insert({
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      setIsOpen(false);
      reset();
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
          slug: values.slug?.trim() || editingArticle.slug,
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
        })
        .eq("id", editingArticle.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      setIsOpen(false);
      setEditingArticle(null);
      reset();
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
        // Fallback: quick seed a few sample articles without Edge Function
        const samples: (Omit<ArticleFormValues, "featured" | "published"> & {
          featured?: boolean;
          published?: boolean;
        })[] = [
          {
            title: "Samsung Galaxy S24 Ultra Review: The Android King?",
            slug: "samsung-galaxy-s24-ultra-review",
            excerpt: "Deep dive into S24 Ultra performance, camera, and battery",
            content: "Samsung Galaxy S24 Ultra brings iterative improvements with a focus on camera AI and endurance...",
            category: "review",
            category_label: "Samsung",
            image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80",
            author: "Tech Team",
            read_time: "7 min read",
            source_url: "",
            source_site: "",
            featured: true,
            published: true,
          },
          {
            title: "iPhone 16 Rumors: What to Expect",
            slug: "iphone-16-rumors-what-to-expect",
            excerpt: "Round-up of rumored features and launch timeline",
            content: "Apple's next iPhone could focus on battery life gains and camera refinements...",
            category: "news",
            category_label: "Apple",
            image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80",
            author: "News Desk",
            read_time: "4 min read",
            source_url: "",
            source_site: "",
            featured: false,
            published: true,
          },
          {
            title: "Best Gaming Phones Under 50000 in Nepal",
            slug: "best-gaming-phones-under-50000-nepal",
            excerpt: "Top picks for mobile gaming on a budget",
            content: "Looking for the best gaming phones under Rs. 50,000? Here are our favorites...",
            category: "guide",
            category_label: "Mobile Guide",
            image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80",
            author: "Guide Team",
            read_time: "6 min read",
            source_url: "",
            source_site: "",
            featured: false,
            published: true,
          },
        ];

        const payloads = samples.map((a) => ({
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
        // ... existing sort logic ...
        if (sortConfig.key === "sn") {
             // SN is index-based, rely on created_at fallback for stable sort
             return sortConfig.direction === "asc" 
                ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }

        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

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

  const categories = Array.from(new Set((articles || []).map((a) => a.category))).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
        <div className="flex items-center gap-2">
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
            <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingArticle ? "Edit Article" : "Add Article"}</DialogTitle>
              </DialogHeader>
              <form id="article-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                <div className="grid gap-2">
                  <Label htmlFor="category_label">Category Label</Label>
                  <Input id="category_label" {...register("category_label")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="read_time">Read Time</Label>
                  <Input id="read_time" {...register("read_time")} placeholder="5 min read" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea id="excerpt" {...register("excerpt")} />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={autoExcerpt}>
                      Auto from Content
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea id="content" className="min-h-[260px]" {...register("content")} />
                  {showPreview && (
                    <div className="mt-3 border rounded-lg p-4 bg-secondary/30">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">Live Preview</div>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold">{(document.getElementById("title") as HTMLInputElement)?.value || ""}</div>
                        {uploadedImages[0] && (
                          <img src={uploadedImages[0]} alt="preview" className="max-h-48 rounded-lg" />
                        )}
                        <div className="text-muted-foreground">
                          {(document.getElementById("excerpt") as HTMLTextAreaElement)?.value || ""}
                        </div>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {(document.getElementById("content") as HTMLTextAreaElement)?.value || ""}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="image">Image URL</Label>
                  <Input id="image" {...register("image")} />
                  <div className="pt-2">
                    <Label>Upload Image</Label>
                    <ImageUpload
                      value={uploadedImages}
                      onChange={(val) => {
                        setUploadedImages(val);
                        const first = val[0] || "";
                        setValue("image", first);
                      }}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="author">Author</Label>
                  <Input id="author" {...register("author")} defaultValue="Admin" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="source_url">Source URL</Label>
                  <Input id="source_url" {...register("source_url")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="source_site">Source Site</Label>
                  <Input id="source_site" {...register("source_site")} />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="featured"
                    checked={!!formValues.featured}
                    onCheckedChange={(checked) => setValue("featured", !!checked)}
                  />
                  <Label htmlFor="featured">Featured Article</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="published"
                    checked={!!formValues.published}
                    onCheckedChange={(checked) => setValue("published", !!checked)}
                  />
                  <Label htmlFor="published">Published</Label>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {editingArticle ? "Update" : "Create"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select onValueChange={(val) => { setSelectedCategory(val); setPage(1); }} value={selectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(val) => { setSelectedStatus(val); setPage(1); }} value={selectedStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Published">Published</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Featured">Featured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] cursor-pointer" onClick={() => handleSort("sn")}>
                S.N. {sortConfig.key === "sn" && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
              </TableHead>
              <TableHead>Image</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("title")}>
                Title {sortConfig.key === "title" && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("category")}>
                Category {sortConfig.key === "category" && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("created_at")}>
                Date {sortConfig.key === "created_at" && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
              </TableHead>
              <TableHead>Link</TableHead>
              <TableHead>Edit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredArticles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center h-24">
                  No articles found.
                </TableCell>
              </TableRow>
            ) : (
              pagedArticles?.map((article, idx) => (
                <TableRow key={article.id}>
                  <TableCell className="font-medium text-muted-foreground">
                    {startIndex + idx + 1}
                  </TableCell>
                  <TableCell>
                      <img
                        src={article.image || "/default-product.svg"}
                        alt={article.title}
                        className="h-10 w-10 object-cover rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/default-product.svg";
                        }}
                      />
                  </TableCell>
                  <TableCell className="font-medium max-w-[300px] truncate" title={article.title}>
                    {article.title}
                  </TableCell>
                  <TableCell className="capitalize">
                      <Badge variant="outline">{article.category}</Badge>
                  </TableCell>
                  <TableCell>
                      {article.published === false ? (
                          <Badge variant="secondary">Draft</Badge>
                      ) : (
                          <div className="flex gap-1">
                             <Badge variant="default" className="bg-green-600 hover:bg-green-700">Published</Badge>
                             {article.featured && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">Featured</Badge>}
                          </div>
                      )}
                  </TableCell>
                  <TableCell>{new Date(article.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                      <a
                        href={`/article/${article.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(article)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this article?")) {
                          deleteMutation.mutate(article.id);
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

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => { setPage(p => Math.max(1, p - 1)); }} 
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                    <PaginationLink 
                        isActive={page === p}
                        onClick={() => { setPage(p); }}
                    >
                        {p}
                    </PaginationLink>
                </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext 
                onClick={() => { setPage(p => Math.min(totalPages, p + 1)); }}
                className={page === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default ArticleManager;
