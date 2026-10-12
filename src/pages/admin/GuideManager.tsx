import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { GUIDES_COLUMNS } from "@/lib/supabaseColumnMaps";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Pencil, Trash2, Search, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";

interface GuideFormValues {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  guide_type: string;
  image: string;
  author: string;
  read_time: string;
  source_url: string;
  source_site: string;
  featured: boolean;
  published: boolean;
}

interface Guide extends GuideFormValues {
  id: string;
  created_at: string;
}

export default function GuideManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [search, setSearch] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch, control } = useForm<GuideFormValues>({
    defaultValues: {
      featured: false,
      published: true,
      author: "Admin",
      read_time: "5 min read",
      slug: "",
      category: "mobile",
      guide_type: "buying",
      source_site: "",
      source_url: "",
    },
  });

  const formValues = watch();
  const { role } = useAuth();
  const isPlatformAdmin = role === "suadmin" || role === "staffadmin";

  const { data: guides, isLoading, error: guidesError } = useQuery<Guide[]>({
    queryKey: ["guides", "admin"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("guides")        .select(GUIDES_COLUMNS.join(",")).order("created_at", { ascending: false });
        if (error) throw error;
        return data as Guide[];
      } catch (err) {
        handleSupabaseError(err, "GuideManager: Failed to fetch guides");
        return [];
      }
    },
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: async (values: GuideFormValues) => {
      const slug =
        values.slug?.trim() ||
        values.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now();

      const { error } = await supabase.from("guides").insert({
        title: values.title,
        slug,
        excerpt: values.excerpt || null,
        content: values.content || null,
        category: values.category,
        guide_type: values.guide_type || "buying",
        image: values.image || null,
        author: values.author || "Admin",
        read_time: values.read_time || "5 min read",
        featured: values.featured,
        published: values.published,
        source_url: values.source_url || null,
        source_site: values.source_site || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guides", "admin"] });
      setIsOpen(false);
      reset();
      toast.success("Guide created successfully");
    },
    onError: (error) => {
      toast.error(`Error creating guide: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: GuideFormValues) => {
      const { error } = await supabase
        .from("guides")
        .update({
          title: values.title,
          slug: values.slug?.trim() || editingGuide.slug,
          excerpt: values.excerpt || null,
          content: values.content || null,
          category: values.category,
          guide_type: values.guide_type || null,
          image: values.image || null,
          author: values.author || null,
          read_time: values.read_time || null,
          featured: values.featured,
          published: values.published,
          source_url: values.source_url || null,
          source_site: values.source_site || null,
        })
        .eq("id", editingGuide.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guides", "admin"] });
      setIsOpen(false);
      setEditingGuide(null);
      reset();
      toast.success("Guide updated successfully");
    },
    onError: (error) => {
      toast.error(`Error updating guide: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("guides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guides", "admin"] });
      toast.success("Guide deleted successfully");
    },
    onError: (error) => {
      toast.error(`Error deleting guide: ${error.message}`);
    },
  });

  const onSubmit = (values: GuideFormValues) => {
    if (editingGuide) updateMutation.mutate(values);
    else createMutation.mutate(values);
  };

  const handleEdit = (guide: Guide) => {
    setEditingGuide(guide);
    setValue("title", guide.title);
    setValue("slug", guide.slug || "");
    setValue("excerpt", guide.excerpt || "");
    setValue("content", guide.content || "");
    setValue("category", guide.category || "mobile");
    setValue("guide_type", guide.guide_type || "buying");
    setValue("image", guide.image || "");
    setUploadedImages(guide.image ? [guide.image] : []);
    setValue("author", guide.author || "Admin");
    setValue("read_time", guide.read_time || "5 min read");
    setValue("source_url", guide.source_url || "");
    setValue("source_site", guide.source_site || "");
    setValue("featured", guide.featured || false);
    setValue("published", guide.published !== false);
    setIsOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditingGuide(null);
      reset({
        featured: false,
        published: true,
        author: "Admin",
        read_time: "5 min read",
        slug: "",
        category: "mobile",
        guide_type: "buying",
        source_site: "",
        source_url: "",
      });
      setUploadedImages([]);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const existingDraft = localStorage.getItem("guide-draft");
    if (existingDraft && !editingGuide) {
      try {
        const draft = JSON.parse(existingDraft) as Partial<GuideFormValues>;
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
  }, [isOpen, editingGuide, setValue]);

  const persistDraft = () => {
    const formEl = document.querySelector<HTMLFormElement>("#guide-form");
    if (!formEl) return;
    const fd = new FormData(formEl);
    const draft: Partial<GuideFormValues> = {
      title: String(fd.get("title") || ""),
      slug: String(fd.get("slug") || ""),
      excerpt: String(fd.get("excerpt") || ""),
      content: String(fd.get("content") || ""),
      category: String(fd.get("category") || ""),
      image: String(fd.get("image") || ""),
      author: String(fd.get("author") || ""),
      read_time: String(fd.get("read_time") || ""),
      source_url: String(fd.get("source_url") || ""),
      source_site: String(fd.get("source_site") || ""),
    };
    localStorage.setItem("guide-draft", JSON.stringify(draft));
    toast.success("Draft saved locally");
  };

  const generateSlug = () => {
    const titleInput = document.getElementById("title") as HTMLInputElement | null;
    const title = titleInput?.value || "";
    const slug =
      title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "";
    setValue("slug", slug);
  };

  const autoExcerpt = () => {
    const contentInput = document.getElementById("content") as HTMLTextAreaElement | null;
    const content = contentInput?.value || "";
    const excerpt = content.replace(/\s+/g, " ").trim().slice(0, 220);
    setValue("excerpt", excerpt);
  };

  const filteredGuides = guides?.filter((guide) => guide.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Guides</h1>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Guide
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingGuide ? "Edit Guide" : "Add Guide"}</DialogTitle>
            </DialogHeader>
            <form id="guide-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  value={formValues.category || "mobile"} 
                  onValueChange={(val) => setValue("category", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">mobile</SelectItem>
                    <SelectItem value="laptop">laptop</SelectItem>
                    <SelectItem value="tablet">tablet</SelectItem>
                    <SelectItem value="audio">audio</SelectItem>
                    <SelectItem value="watch">watch</SelectItem>
                    <SelectItem value="gaming">gaming</SelectItem>
                    <SelectItem value="other">other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="guide_type">Guide Type</Label>
                <Input id="guide_type" {...register("guide_type")} placeholder="buying" />
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
                <Label htmlFor="featured">Featured Guide</Label>
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
                {createMutation.isPending || updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingGuide ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search guides..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredGuides?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  No guides found.
                </TableCell>
              </TableRow>
            ) : (
              filteredGuides?.map((guide) => (
                <TableRow key={guide.id}>
                  <TableCell>
                    {guide.image ? (
                      <img src={guide.image} alt={guide.title} className="h-10 w-10 object-cover rounded" />
                    ) : null}
                  </TableCell>
                  <TableCell className="font-medium max-w-[300px] truncate" title={guide.title}>
                    {guide.title}
                  </TableCell>
                  <TableCell className="capitalize">{guide.category}</TableCell>
                  <TableCell>{new Date(guide.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {guide.source_url ? (
                      <a
                        href={guide.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Link <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link to={`/guide/${guide.slug}`} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(guide)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this guide?")) {
                          deleteMutation.mutate(guide.id);
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
    </div>
  );
}
