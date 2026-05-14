import DOMPurify from "dompurify";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Edit, CheckCircle, XCircle, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { ImageUpload } from "@/components/ui/image-upload";

interface ContentPageForm {
  title: string;
  slug: string;
  content: string;
  is_published: boolean;
}

interface ContentPage extends ContentPageForm {
  id: string;
  created_at?: string;
}

const ContentManager = () => {
  const [editingPage, setEditingPage] = useState<ContentPage | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const { register, handleSubmit, setValue, reset, watch } = useForm<ContentPageForm>();

  const { data: pages, isLoading, error: pagesError } = useQuery<ContentPage[]>({
    queryKey: ["admin_content_pages"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("content_pages")
          .select("*")
          .order("title");
        
        if (error) throw error;
        return data as ContentPage[];
      } catch (err) {
        handleSupabaseError(err, "ContentManager: Failed to fetch content pages");
        return [];
      }
    },
    retry: 1,
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
      toast.success(editingPage ? "Page updated successfully" : "Page created successfully");
    },
    onError: (error) => {
      toast.error(`Error saving page: ${error.message}`);
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
      toast.error(`Error deleting page: ${error.message}`);
    },
  });

  const handleEdit = (page: ContentPage) => {
    setEditingPage(page);
    setValue("title", page.title);
    setValue("slug", page.slug);
    setValue("content", page.content || "");
    setValue("is_published", page.is_published);
    setUploadedImages([]);
    setIsOpen(true);
  };

  const handleCreate = () => {
    setEditingPage(null);
    reset({
      title: "",
      slug: "",
      content: "",
      is_published: true,
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
        const draft = JSON.parse(existing) as Partial<ContentPageForm> & { images?: string[] };
        if (draft.title) setValue("title", draft.title);
        if (draft.slug) setValue("slug", draft.slug);
        if (draft.content) setValue("content", draft.content);
        if (typeof draft.is_published === "boolean") setValue("is_published", draft.is_published);
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
      images: uploadedImages,
    };
    const key = `content-draft-${editingPage?.slug || "new"}`;
    localStorage.setItem(key, JSON.stringify(draft));
    toast.success("Draft saved locally");
  };

  const insertImageTag = (url: string) => {
    const contentEl = document.getElementById("content") as HTMLTextAreaElement | null;
    if (!contentEl) return;
    const tag = `<img src="${url}" alt="" />`;
    const start = contentEl.selectionStart ?? contentEl.value.length;
    const end = contentEl.selectionEnd ?? contentEl.value.length;
    const newVal = contentEl.value.slice(0, start) + tag + contentEl.value.slice(end);
    setValue("content", newVal);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Content Pages</h1>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Page
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : pages?.map((page) => (
              <TableRow key={page.id}>
                <TableCell className="font-medium">{page.title}</TableCell>
                <TableCell>{page.slug}</TableCell>
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
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(page)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(page.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPage ? `Edit Page: ${editingPage.title}` : "Create New Page"}</DialogTitle>
          </DialogHeader>
          <form id="content-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-2">
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
              <Label htmlFor="content">Content (HTML supported)</Label>
              <Textarea
                id="content"
                {...register("content")}
                className="min-h-[320px] font-mono"
              />
              {showPreview && (
                <div className="mt-3 border rounded-lg p-4 bg-secondary/30">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Live Preview</div>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(watch("content") || "") }}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant={showPreview ? "secondary" : "outline"} size="sm" onClick={() => setShowPreview(v => !v)}>
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={persistDraft}>
                  Save Draft (Local)
                </Button>
              </div>
              <div className="pt-2 space-y-2">
                <Label>Upload Image</Label>
                <ImageUpload
                  value={uploadedImages}
                  onChange={(val) => {
                    setUploadedImages(val);
                    if (val[0]) insertImageTag(val[0]);
                  }}
                  disabled={saveMutation.isPending}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="is_published" 
                {...register("is_published")} 
                className="h-4 w-4"
              />
              <Label htmlFor="is_published">Published</Label>
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingPage ? "Save Changes" : "Create Page"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentManager;
