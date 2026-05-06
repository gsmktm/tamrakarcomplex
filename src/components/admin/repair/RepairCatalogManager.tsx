import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2, Wrench, Smartphone, FolderTree, FileText, Package, Hammer } from "lucide-react";
import { getErrorMessage } from "@/lib/utils";

// Supabase types in this repo may not include the Repair module tables yet.
// Cast to any so the admin UI compiles even before types are regenerated.

type RepairCategory = {
  id: string;
  name: string;
  parent_id?: string;
};

type RepairDevice = {
  id: string;
  name: string;
  brand?: string;
  category_id?: string;
};

type RepairTool = {
  id: string;
  name: string;
  description?: string;
};

type RepairPart = {
  id: string;
  name: string;
  description?: string;
};

type RepairGuide = {
  id: string;
  title: string;
  description?: string;
  device_id: string;
  difficulty?: string;
  estimated_time?: number;
};

type RepairGuideWithDevice = RepairGuide & { repair_devices?: RepairDevice };

type RepairStep = {
  id: string;
  guide_id: string;
  step_number: number;
  title: string;
  description?: string;
  difficulty?: string;
};

type RepairGuideTool = {
  tool_id: string;
  repair_tools: RepairTool;
};

type RepairGuidePart = {
  part_id: string;
  repair_parts: RepairPart;
};

function isSchemaMissingError(error: { code?: string; message?: string } | null) {
  const code = (error?.code as string | undefined) ?? "";
  const message = ((error?.message as string | undefined) ?? "").toLowerCase();
  return (
    code === "PGRST200" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    code === "42703" ||
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    message.includes("could not find a relationship") ||
    message.includes("does not exist")
  );
}

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  parent_id: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  seo_keywords: z.string().optional().nullable(),
});

const deviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  brand: z.string().min(1, "Brand is required"),
  model_number: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  specifications_text: z.string().optional().nullable(),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  seo_keywords: z.string().optional().nullable(),
});

const toolSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  seo_keywords: z.string().optional().nullable(),
});

const partSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  estimated_price: z.coerce.number().optional().nullable(),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  seo_keywords: z.string().optional().nullable(),
});

const guideSchema = z.object({
  device_id: z.string().min(1, "Device is required"),
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  image: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  difficulty: z.enum(["easy", "moderate", "difficult", "very_difficult"]),
  time_estimate: z.string().optional().nullable(),
  guide_type: z.string().optional().nullable(),
  author: z.string().optional().nullable(),
  published: z.boolean().default(true),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  seo_keywords: z.string().optional().nullable(),
});

const stepSchema = z.object({
  step_number: z.coerce.number().int().min(1, "Step number is required"),
  title: z.string().optional().nullable(),
  content: z.string().min(1, "Content is required"),
  images_text: z.string().optional().nullable(),
  video_url: z.string().optional().nullable(),
});

function parseJsonOrThrow(text: string | null | undefined) {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("Specifications must be valid JSON.");
  }
}

function generateSEO(name: string, description?: string | null) {
  const title = `${name} Repair`;
  const desc = description ? `${description.slice(0, 150)}${description.length > 150 ? '...' : ''}` : `Comprehensive repair guides for ${name}. Find step-by-step tutorials, required tools, and replacement parts.`;
  const keywords = `${name}, repair, guide, tutorial, fix, how to`;
  return { seo_title: title, seo_description: desc, seo_keywords: keywords };
}

function imagesFromText(text: string | null | undefined): string[] {
  return (text ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function imagesToText(images: unknown): string {
  if (!Array.isArray(images)) return "";
  return (images as unknown[]).map((s) => String(s)).join("\n");
}

function SetupMissingBanner() {
  return (
    <div className="rounded-xl border bg-muted/30 p-4 text-sm">
      <div className="font-semibold">Repair module not configured</div>
      <div className="mt-1 text-muted-foreground">
        Missing database tables (e.g. `repair_categories`, `repair_devices`, `repair_guides`). Apply the latest Supabase migrations and refresh.
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">Run: `npm run supabase:reset` (local)</Badge>
        <Badge variant="outline">Or apply migrations to your project DB</Badge>
      </div>
    </div>
  );
}

function StepEditorDialog({
  open,
  onOpenChange,
  guideId,
  step,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  guideId: string;
  step: RepairStep | null;
}) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof stepSchema>>({
    resolver: zodResolver(stepSchema),
    defaultValues: {
      step_number: 1,
      title: "",
      content: "",
      images_text: "",
      video_url: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: z.infer<typeof stepSchema>) => {
      const payload = {
        guide_id: guideId,
        step_number: values.step_number,
        title: values.title || null,
        content: values.content,
        images: imagesFromText(values.images_text),
        video_url: values.video_url || null,
      };

      if (step?.id) {
        const { error } = await supabase.from("repair_steps").update(payload).eq("id", step.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("repair_steps").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-guide-full", guideId] });
      toast.success(step ? "Step updated" : "Step added");
      onOpenChange(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Reset form when opening/editing
  useEffect(() => {
    if (!open) return;
    form.reset({
      step_number: step?.step_number ?? 1,
      title: step?.title ?? "",
      content: step?.content ?? "",
      images_text: imagesToText(step?.images),
      video_url: step?.video_url ?? "",
    });
  }, [open, step, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step ? "Edit Step" : "Add Step"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="step_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Step #</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Remove the screws" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-[160px]" placeholder="Write instructions..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="images_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Images (one URL per line)</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-[110px]" placeholder="https://..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="video_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Step
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function GuideEditorDialog({
  open,
  onOpenChange,
  guideId,
  devices,
  tools,
  parts,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  guideId: string | null;
  devices: RepairDevice[];
  tools: RepairTool[];
  parts: RepairPart[];
}) {
  const queryClient = useQueryClient();
  const [stepEditorOpen, setStepEditorOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<RepairStep | null>(null);
  const [attachToolId, setAttachToolId] = useState<string>("");
  const [attachPartId, setAttachPartId] = useState<string>("");

  const { data: full, isLoading, error } = useQuery({
    queryKey: ["admin-repair-guide-full", guideId],
    enabled: open && !!guideId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("repair_guides")
        .select(
          `
          *,
          repair_steps (*),
          repair_guide_tools (tool_id, repair_tools (*)),
          repair_guide_parts (part_id, repair_parts (*))
        `,
        )
        .eq("id", guideId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<z.infer<typeof guideSchema>>({
    resolver: zodResolver(guideSchema),
    defaultValues: {
      device_id: "",
      title: "",
      slug: "",
      image: "",
      summary: "",
      difficulty: "easy",
      time_estimate: "",
      guide_type: "repair",
      author: "",
      published: true,
    },
  });

  useEffect(() => {
    if (!open || !full) return;
    form.reset({
      device_id: full.device_id ?? "",
      title: full.title ?? "",
      slug: full.slug ?? "",
      image: full.image ?? "",
      summary: full.summary ?? "",
      difficulty: (full.difficulty ?? "easy") as string,
      time_estimate: full.time_estimate ?? "",
      guide_type: full.guide_type ?? "repair",
      author: full.author ?? "",
      published: full.published !== false,
      seo_title: full.seo_title ?? "",
      seo_description: full.seo_description ?? "",
      seo_keywords: full.seo_keywords ?? "",
    });
  }, [open, full, form]);

  const saveGuideMutation = useMutation({
    mutationFn: async (values: z.infer<typeof guideSchema>) => {
      if (!guideId) throw new Error("Missing guide id");
      const payload = {
        device_id: values.device_id,
        title: values.title,
        slug: values.slug,
        image: values.image || null,
        summary: values.summary || null,
        difficulty: values.difficulty,
        time_estimate: values.time_estimate || null,
        guide_type: values.guide_type || "repair",
        author: values.author || null,
        published: values.published,
      };
      const { error } = await supabase.from("repair_guides").update(payload).eq("id", guideId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-guides"] });
      queryClient.invalidateQueries({ queryKey: ["admin-repair-guide-full", guideId] });
      toast.success("Guide saved");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase.from("repair_steps").delete().eq("id", stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-guide-full", guideId] });
      toast.success("Step deleted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const attachToolMutation = useMutation({
    mutationFn: async (toolId: string) => {
      if (!guideId) throw new Error("Missing guide id");
      const { error } = await supabase.from("repair_guide_tools").insert({ guide_id: guideId, tool_id: toolId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-guide-full", guideId] });
      setAttachToolId("");
      toast.success("Tool attached");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const detachToolMutation = useMutation({
    mutationFn: async (toolId: string) => {
      if (!guideId) throw new Error("Missing guide id");
      const { error } = await supabase.from("repair_guide_tools").delete().eq("guide_id", guideId).eq("tool_id", toolId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-guide-full", guideId] });
      toast.success("Tool removed");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const attachPartMutation = useMutation({
    mutationFn: async (partId: string) => {
      if (!guideId) throw new Error("Missing guide id");
      const { error } = await supabase.from("repair_guide_parts").insert({ guide_id: guideId, part_id: partId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-guide-full", guideId] });
      setAttachPartId("");
      toast.success("Part attached");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const detachPartMutation = useMutation({
    mutationFn: async (partId: string) => {
      if (!guideId) throw new Error("Missing guide id");
      const { error } = await supabase.from("repair_guide_parts").delete().eq("guide_id", guideId).eq("part_id", partId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-guide-full", guideId] });
      toast.success("Part removed");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const steps: RepairStep[] = useMemo(() => {
    const list = (full?.repair_steps as RepairStep[]) ?? [];
    return [...list].sort((a, b) => (a.step_number ?? 0) - (b.step_number ?? 0));
  }, [full]);

  const attachedTools = useMemo(() => {
    const list = (full?.repair_guide_tools as RepairGuideTool[]) ?? [];
    return list.map((t) => t.repair_tools).filter(Boolean);
  }, [full]);

  const attachedParts = useMemo(() => {
    const list = (full?.repair_guide_parts as RepairGuidePart[]) ?? [];
    return list.map((p) => p.repair_parts).filter(Boolean);
  }, [full]);

  const attachedToolIds = new Set(attachedTools.map((t: RepairGuideTool) => t.repair_tools.id));
  const attachedPartIds = new Set(attachedParts.map((p: RepairGuidePart) => p.repair_parts.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[960px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Guide</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            {getErrorMessage(error)}
          </div>
        ) : !full ? null : (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="steps">Steps</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
              <TabsTrigger value="parts">Parts</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="pt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => saveGuideMutation.mutate(v))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="device_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Device</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select device" />
                            </SelectTrigger>
                            <SelectContent>
                              {devices.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.brand} — {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between rounded-xl border p-3 mt-6">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">Published</div>
                        <div className="text-[11px] text-muted-foreground">Visible on `/repair`.</div>
                      </div>
                      <Switch checked={form.watch("published")} onCheckedChange={(v) => form.setValue("published", v)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slug</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="moderate">Moderate</SelectItem>
                              <SelectItem value="difficult">Difficult</SelectItem>
                              <SelectItem value="very_difficult">Very difficult</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="time_estimate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time Estimate</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. 30–60 minutes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="guide_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Guide Type</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="repair / teardown / replacement" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="author"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Author</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Tech Team" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cover Image URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Summary</FormLabel>
                        <FormControl>
                          <Textarea {...field} className="min-h-[90px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">SEO Settings</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const title = form.getValues("title");
                          const summary = form.getValues("summary");
                          const seo = generateSEO(title, summary);
                          form.setValue("seo_title", seo.seo_title);
                          form.setValue("seo_description", seo.seo_description);
                          form.setValue("seo_keywords", seo.seo_keywords);
                        }}
                      >
                        Auto Generate
                      </Button>
                    </div>

                    <FormField
                      control={form.control}
                      name="seo_title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SEO Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Page title for search engines" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="seo_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SEO Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} className="min-h-[60px]" placeholder="Meta description for search engines" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="seo_keywords"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SEO Keywords</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Comma-separated keywords" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={saveGuideMutation.isPending}>
                    {saveGuideMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Guide
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="steps" className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Ordered by step number.</div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingStep(null);
                    setStepEditorOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Step
                </Button>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {steps.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-10 text-sm text-muted-foreground">
                          No steps yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      steps.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs font-bold">{s.step_number}</TableCell>
                          <TableCell className="font-medium">{s.title || `Step ${s.step_number}`}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingStep(s);
                                setStepEditorOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() => {
                                if (confirm("Delete this step?")) deleteStepMutation.mutate(s.id);
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

              <StepEditorDialog
                open={stepEditorOpen}
                onOpenChange={setStepEditorOpen}
                guideId={full.id}
                step={editingStep}
              />
            </TabsContent>

            <TabsContent value="tools" className="pt-4 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">Attach tools to show on the public guide page.</div>
                <div className="flex gap-2">
                  <Select value={attachToolId} onValueChange={setAttachToolId}>
                    <SelectTrigger className="w-[260px]">
                      <SelectValue placeholder="Select tool" />
                    </SelectTrigger>
                    <SelectContent>
                      {tools.map((t) => (
                        <SelectItem key={t.id} value={t.id} disabled={attachedToolIds.has(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => attachToolId && attachToolMutation.mutate(attachToolId)} disabled={!attachToolId}>
                    Attach
                  </Button>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tool</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attachedTools.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-10 text-sm text-muted-foreground">
                          No tools attached.
                        </TableCell>
                      </TableRow>
                    ) : (
                      attachedTools.map((t: RepairGuideTool) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => detachToolMutation.mutate(t.id)}>
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="parts" className="pt-4 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">Attach parts to show on the public guide page.</div>
                <div className="flex gap-2">
                  <Select value={attachPartId} onValueChange={setAttachPartId}>
                    <SelectTrigger className="w-[260px]">
                      <SelectValue placeholder="Select part" />
                    </SelectTrigger>
                    <SelectContent>
                      {parts.map((p) => (
                        <SelectItem key={p.id} value={p.id} disabled={attachedPartIds.has(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => attachPartId && attachPartMutation.mutate(attachPartId)} disabled={!attachPartId}>
                    Attach
                  </Button>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attachedParts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-10 text-sm text-muted-foreground">
                          No parts attached.
                        </TableCell>
                      </TableRow>
                    ) : (
                      attachedParts.map((p: RepairGuidePart) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {p.name}
                            {p.estimated_price ? (
                              <span className="ml-2 text-xs text-muted-foreground">Rs. {Number(p.estimated_price).toLocaleString()}</span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => detachPartMutation.mutate(p.id)}>
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RepairCatalogManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"categories" | "devices" | "guides" | "tools" | "parts">("categories");

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RepairCategory | null>(null);

  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<RepairDevice | null>(null);

  const [toolDialogOpen, setToolDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<RepairTool | null>(null);

  const [partDialogOpen, setPartDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<RepairPart | null>(null);

  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<RepairGuide | null>(null);
  const [manageGuideOpen, setManageGuideOpen] = useState(false);
  const [manageGuideId, setManageGuideId] = useState<string | null>(null);
  const [guideDeviceFilter, setGuideDeviceFilter] = useState<string>("all");

  const { data: health } = useQuery({
    queryKey: ["repair-catalog-health"],
    queryFn: async () => {
      const { error } = await supabase.from("repair_devices").select("id", { head: true, count: "exact" });
      if (error) return { ok: false as const, error };
      return { ok: true as const, error: null };
    },
    staleTime: 30_000,
  });

  const schemaMissing = !!health && !health.ok && isSchemaMissingError(health.error);

  const { data: categories } = useQuery({
    queryKey: ["admin-repair-categories"],
    enabled: !schemaMissing,
    queryFn: async () => {
      const { data, error } = await supabase.from("repair_categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: devices } = useQuery({
    queryKey: ["admin-repair-devices"],
    enabled: !schemaMissing,
    queryFn: async () => {
      const { data, error } = await sb
        .from("repair_devices")
        .select("*, repair_categories(id,name,slug)")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: guides } = useQuery({
    queryKey: ["admin-repair-guides"],
    enabled: !schemaMissing,
    queryFn: async () => {
      const { data, error } = await sb
        .from("repair_guides")
        .select("*, repair_devices(id,name,brand,slug)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tools } = useQuery({
    queryKey: ["admin-repair-tools"],
    enabled: !schemaMissing,
    queryFn: async () => {
      const { data, error } = await supabase.from("repair_tools").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: parts } = useQuery({
    queryKey: ["admin-repair-parts"],
    enabled: !schemaMissing,
    queryFn: async () => {
      const { data, error } = await supabase.from("repair_parts").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Category form ─────────────────────────────────────────────────────────
  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", slug: "", parent_id: null, image: "", description: "", seo_title: "", seo_description: "", seo_keywords: "" },
  });

  const saveCategoryMutation = useMutation({
    mutationFn: async (values: z.infer<typeof categorySchema>) => {
      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim(),
        parent_id: values.parent_id || null,
        image: values.image || null,
        description: values.description || null,
        seo_title: values.seo_title || null,
        seo_description: values.seo_description || null,
        seo_keywords: values.seo_keywords || null,
      };
      if (editingCategory?.id) {
        const { error } = await supabase.from("repair_categories").update(payload).eq("id", editingCategory.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("repair_categories").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-categories"] });
      toast.success(editingCategory ? "Category updated" : "Category created");
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("repair_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-categories"] });
      toast.success("Category deleted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── Device form ───────────────────────────────────────────────────────────
  const deviceForm = useForm<z.infer<typeof deviceSchema>>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: "",
      slug: "",
      brand: "",
      model_number: "",
      category_id: null,
      image: "",
      summary: "",
      specifications_text: "",
      seo_title: "",
      seo_description: "",
      seo_keywords: "",
    },
  });

  const saveDeviceMutation = useMutation({
    mutationFn: async (values: z.infer<typeof deviceSchema>) => {
      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim(),
        brand: values.brand.trim(),
        model_number: values.model_number || null,
        category_id: values.category_id || null,
        image: values.image || null,
        summary: values.summary || null,
        specifications: parseJsonOrThrow(values.specifications_text),
        seo_title: values.seo_title || null,
        seo_description: values.seo_description || null,
        seo_keywords: values.seo_keywords || null,
      };
      if (editingDevice?.id) {
        const { error } = await supabase.from("repair_devices").update(payload).eq("id", editingDevice.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("repair_devices").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-devices"] });
      toast.success(editingDevice ? "Device updated" : "Device created");
      setDeviceDialogOpen(false);
      setEditingDevice(null);
      deviceForm.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("repair_devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-devices"] });
      toast.success("Device deleted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── Tool form ─────────────────────────────────────────────────────────────
  const toolForm = useForm<z.infer<typeof toolSchema>>({
    resolver: zodResolver(toolSchema),
    defaultValues: { name: "", url: "", image: "", seo_title: "", seo_description: "", seo_keywords: "" },
  });

  const saveToolMutation = useMutation({
    mutationFn: async (values: z.infer<typeof toolSchema>) => {
      const payload = { name: values.name.trim(), url: values.url || null, image: values.image || null, seo_title: values.seo_title || null, seo_description: values.seo_description || null, seo_keywords: values.seo_keywords || null };
      if (editingTool?.id) {
        const { error } = await supabase.from("repair_tools").update(payload).eq("id", editingTool.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("repair_tools").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-tools"] });
      toast.success(editingTool ? "Tool updated" : "Tool created");
      setToolDialogOpen(false);
      setEditingTool(null);
      toolForm.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteToolMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("repair_tools").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-tools"] });
      toast.success("Tool deleted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── Part form ─────────────────────────────────────────────────────────────
  const partForm = useForm<z.infer<typeof partSchema>>({
    resolver: zodResolver(partSchema),
    defaultValues: { name: "", url: "", image: "", estimated_price: null, seo_title: "", seo_description: "", seo_keywords: "" },
  });

  const savePartMutation = useMutation({
    mutationFn: async (values: z.infer<typeof partSchema>) => {
      const payload = {
        name: values.name.trim(),
        url: values.url || null,
        image: values.image || null,
        estimated_price: values.estimated_price ?? null,
        seo_title: values.seo_title || null,
        seo_description: values.seo_description || null,
        seo_keywords: values.seo_keywords || null,
      };
      if (editingPart?.id) {
        const { error } = await supabase.from("repair_parts").update(payload).eq("id", editingPart.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("repair_parts").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-parts"] });
      toast.success(editingPart ? "Part updated" : "Part created");
      setPartDialogOpen(false);
      setEditingPart(null);
      partForm.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deletePartMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("repair_parts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-parts"] });
      toast.success("Part deleted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── Guide form ────────────────────────────────────────────────────────────
  const guideForm = useForm<z.infer<typeof guideSchema>>({
    resolver: zodResolver(guideSchema),
    defaultValues: {
      device_id: "",
      title: "",
      slug: "",
      image: "",
      summary: "",
      difficulty: "easy",
      time_estimate: "",
      guide_type: "repair",
      author: "",
      published: true,
      seo_title: "",
      seo_description: "",
      seo_keywords: "",
    },
  });

  const saveGuideMutation = useMutation({
    mutationFn: async (values: z.infer<typeof guideSchema>) => {
      const payload = {
        device_id: values.device_id,
        title: values.title.trim(),
        slug: values.slug.trim(),
        image: values.image || null,
        summary: values.summary || null,
        difficulty: values.difficulty,
        time_estimate: values.time_estimate || null,
        guide_type: values.guide_type || "repair",
        author: values.author || null,
        published: values.published,
        seo_title: values.seo_title || null,
        seo_description: values.seo_description || null,
        seo_keywords: values.seo_keywords || null,
      };
      if (editingGuide?.id) {
        const { error } = await supabase.from("repair_guides").update(payload).eq("id", editingGuide.id);
        if (error) throw error;
        return;
      }
      const { data, error } = await supabase.from("repair_guides").insert(payload).select("id").single();
      if (error) throw error;
      return data?.id as string | undefined;
    },
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-guides"] });
      toast.success(editingGuide ? "Guide updated" : "Guide created");
      setGuideDialogOpen(false);
      const id = editingGuide?.id ?? newId;
      setEditingGuide(null);
      guideForm.reset();
      if (id) {
        setManageGuideId(id);
        setManageGuideOpen(true);
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteGuideMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("repair_guides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-guides"] });
      toast.success("Guide deleted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const devicesList = devices ?? [];
  const toolsList = tools ?? [];
  const partsList = parts ?? [];
  const guidesList = useMemo(() => {
    const list = guides ?? [];
    if (guideDeviceFilter === "all") return list;
    return list.filter((g: RepairGuide) => g.device_id === guideDeviceFilter);
  }, [guides, guideDeviceFilter]);

  if (schemaMissing) {
    return <SetupMissingBanner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Repair Catalog (iFixit-style)</h2>
          <p className="text-muted-foreground">Categories → Devices → Guides → Steps + Tools + Parts</p>
        </div>
      </div>

                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="h-4 w-4" /> Categories
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2">
            <Smartphone className="h-4 w-4" /> Devices
          </TabsTrigger>
          <TabsTrigger value="guides" className="gap-2">
            <FileText className="h-4 w-4" /> Guides
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2">
            <Wrench className="h-4 w-4" /> Tools
          </TabsTrigger>
          <TabsTrigger value="parts" className="gap-2">
            <Package className="h-4 w-4" /> Parts
          </TabsTrigger>
        </TabsList>

        {/* Categories */}
        <TabsContent value="categories" className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Create hierarchical categories for `/repair` browsing.</div>
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingCategory(null);
                    categoryForm.reset({ name: "", slug: "", parent_id: null, image: "", description: "", seo_title: "", seo_description: "", seo_keywords: "" });
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
                </DialogHeader>
                <Form {...categoryForm}>
                  <form onSubmit={categoryForm.handleSubmit((v) => saveCategoryMutation.mutate(v))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={categoryForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={categoryForm.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slug</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. smartphone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={categoryForm.control}
                      name="parent_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent</FormLabel>
                          <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select parent (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No parent</SelectItem>
                              {(categories ?? []).map((c: RepairCategory) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={categoryForm.control}
                      name="image"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={categoryForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} className="min-h-[90px]" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">SEO Settings</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const name = categoryForm.getValues("name");
                            const description = categoryForm.getValues("description");
                            const seo = generateSEO(name, description);
                            categoryForm.setValue("seo_title", seo.seo_title);
                            categoryForm.setValue("seo_description", seo.seo_description);
                            categoryForm.setValue("seo_keywords", seo.seo_keywords);
                          }}
                        >
                          Auto Generate
                        </Button>
                      </div>

                      <FormField
                        control={categoryForm.control}
                        name="seo_title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Page title for search engines" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={categoryForm.control}
                        name="seo_description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="min-h-[60px]" placeholder="Meta description for search engines" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={categoryForm.control}
                        name="seo_keywords"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Keywords</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Comma-separated keywords" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={saveCategoryMutation.isPending}>
                      {saveCategoryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Category
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(categories ?? []).map((cat: RepairCategory) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {cat.parent_id ? (categories ?? []).find((c: RepairCategory) => c.id === cat.parent_id)?.name ?? "—" : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingCategory(cat);
                          categoryForm.reset({
                            name: cat.name ?? "",
                            slug: cat.slug ?? "",
                            parent_id: cat.parent_id ?? null,
                            image: cat.image ?? "",
                            description: cat.description ?? "",
                          });
                          setCategoryDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => {
                          if (confirm("Delete this category?")) deleteCategoryMutation.mutate(cat.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(categories ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-sm text-muted-foreground">
                      No categories yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Devices */}
        <TabsContent value="devices" className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Devices appear in `/repair` and hold guides.</div>
            <Dialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingDevice(null);
                    deviceForm.reset({
                      name: "",
                      slug: "",
                      brand: "",
                      model_number: "",
                      category_id: null,
                      image: "",
                      summary: "",
                      specifications_text: "",
                      seo_title: "",
                      seo_description: "",
                      seo_keywords: "",
                    });
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Device
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingDevice ? "Edit Device" : "Add Device"}</DialogTitle>
                </DialogHeader>
                <Form {...deviceForm}>
                  <form onSubmit={deviceForm.handleSubmit((v) => saveDeviceMutation.mutate(v))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={deviceForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={deviceForm.control}
                        name="brand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brand</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Apple" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={deviceForm.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slug</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="iphone-13" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={deviceForm.control}
                        name="model_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model Number</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="A2482" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={deviceForm.control}
                      name="category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No category</SelectItem>
                              {(categories ?? []).map((c: RepairCategory) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={deviceForm.control}
                      name="image"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={deviceForm.control}
                      name="summary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Summary</FormLabel>
                          <FormControl>
                            <Textarea {...field} className="min-h-[90px]" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={deviceForm.control}
                      name="specifications_text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specifications (JSON)</FormLabel>
                          <FormControl>
                            <Textarea {...field} className="min-h-[120px] font-mono text-xs" placeholder={'{"CPU":"...","RAM":"..."}'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">SEO Settings</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const name = deviceForm.getValues("name");
                            const summary = deviceForm.getValues("summary");
                            const seo = generateSEO(name, summary);
                            deviceForm.setValue("seo_title", seo.seo_title);
                            deviceForm.setValue("seo_description", seo.seo_description);
                            deviceForm.setValue("seo_keywords", seo.seo_keywords);
                          }}
                        >
                          Auto Generate
                        </Button>
                      </div>

                      <FormField
                        control={deviceForm.control}
                        name="seo_title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Page title for search engines" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={deviceForm.control}
                        name="seo_description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="min-h-[60px]" placeholder="Meta description for search engines" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={deviceForm.control}
                        name="seo_keywords"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Keywords</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Comma-separated keywords" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={saveDeviceMutation.isPending}>
                      {saveDeviceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Device
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devicesList.map((d: RepairDevice) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      {d.name}
                      {d.model_number ? <span className="ml-2 text-xs text-muted-foreground">{d.model_number}</span> : null}
                    </TableCell>
                    <TableCell>{d.brand}</TableCell>
                    <TableCell className="text-muted-foreground">{d.repair_categories?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{d.slug}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingDevice(d);
                          deviceForm.reset({
                            name: d.name ?? "",
                            slug: d.slug ?? "",
                            brand: d.brand ?? "",
                            model_number: d.model_number ?? "",
                            category_id: d.category_id ?? null,
                            image: d.image ?? "",
                            summary: d.summary ?? "",
                            specifications_text: d.specifications ? JSON.stringify(d.specifications, null, 2) : "",
                          });
                          setDeviceDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => {
                          if (confirm("Delete this device? This also deletes its guides.")) deleteDeviceMutation.mutate(d.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {devicesList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                      No devices yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Guides */}
        <TabsContent value="guides" className="pt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">Guides are public at `/repair/guide/:slug`.</div>
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={guideDeviceFilter} onValueChange={setGuideDeviceFilter}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Filter by device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All devices</SelectItem>
                  {devicesList.map((d: RepairDevice) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.brand} — {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Dialog open={guideDialogOpen} onOpenChange={setGuideDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingGuide(null);
                      guideForm.reset({
                        device_id: guideDeviceFilter !== "all" ? guideDeviceFilter : "",
                        title: "",
                        slug: "",
                        image: "",
                        summary: "",
                        difficulty: "easy",
                        time_estimate: "",
                        guide_type: "repair",
                        author: "",
                        published: true,
                        seo_title: "",
                        seo_description: "",
                        seo_keywords: "",
                      });
                    }}
                    disabled={devicesList.length === 0}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Guide
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingGuide ? "Edit Guide" : "Add Guide"}</DialogTitle>
                  </DialogHeader>
                  <Form {...guideForm}>
                    <form onSubmit={guideForm.handleSubmit((v) => saveGuideMutation.mutate(v))} className="space-y-4">
                      <FormField
                        control={guideForm.control}
                        name="device_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Device</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select device" />
                              </SelectTrigger>
                              <SelectContent>
                {devicesList.map((d: RepairDevice) => (
                                  <SelectItem key={d.id} value={d.id}>
                                    {d.brand} — {d.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={guideForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={guideForm.control}
                          name="slug"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Slug</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="iphone-13-screen-replacement" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={guideForm.control}
                          name="difficulty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Difficulty</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="easy">Easy</SelectItem>
                                  <SelectItem value="moderate">Moderate</SelectItem>
                                  <SelectItem value="difficult">Difficult</SelectItem>
                                  <SelectItem value="very_difficult">Very difficult</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={guideForm.control}
                          name="time_estimate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Time Estimate</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="30–60 minutes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={guideForm.control}
                          name="guide_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Guide Type</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="repair / teardown / replacement" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={guideForm.control}
                          name="author"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Author</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Tech Team" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={guideForm.control}
                        name="image"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cover Image URL</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={guideForm.control}
                        name="summary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Summary</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="min-h-[90px]" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center justify-between rounded-xl border p-3">
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium">Published</div>
                          <div className="text-[11px] text-muted-foreground">Visible on `/repair`.</div>
                        </div>
                        <Switch checked={guideForm.watch("published")} onCheckedChange={(v) => guideForm.setValue("published", v)} />
                      </div>

                      <Button type="submit" className="w-full" disabled={saveGuideMutation.isPending}>
                        {saveGuideMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save & Manage
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guide</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guidesList.map((g: RepairGuideWithDevice) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">
                      {g.title}
                      <div className="text-[11px] text-muted-foreground">{g.slug}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {g.repair_devices ? `${g.repair_devices.brand} — ${g.repair_devices.name}` : "—"}
                    </TableCell>
                    <TableCell>
                      {g.published ? <Badge variant="outline">Published</Badge> : <Badge variant="secondary">Draft</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          setManageGuideId(g.id);
                          setManageGuideOpen(true);
                        }}
                      >
                        <Hammer className="h-4 w-4" />
                        Manage
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingGuide(g);
                          guideForm.reset({
                            device_id: g.device_id ?? "",
                            title: g.title ?? "",
                            slug: g.slug ?? "",
                            image: g.image ?? "",
                            summary: g.summary ?? "",
                            difficulty: (g.difficulty ?? "easy") as string,
                            time_estimate: g.time_estimate ?? "",
                            guide_type: g.guide_type ?? "repair",
                            author: g.author ?? "",
                            published: g.published !== false,
                          });
                          setGuideDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => {
                          if (confirm("Delete this guide?")) deleteGuideMutation.mutate(g.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {guidesList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-sm text-muted-foreground">
                      No guides yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <GuideEditorDialog
            open={manageGuideOpen}
            onOpenChange={setManageGuideOpen}
            guideId={manageGuideId}
            devices={devicesList}
            tools={toolsList}
            parts={partsList}
          />
        </TabsContent>

        {/* Tools */}
        <TabsContent value="tools" className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Tools can be attached to guides.</div>
            <Dialog open={toolDialogOpen} onOpenChange={setToolDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingTool(null);
                    toolForm.reset({ name: "", url: "", image: "", seo_title: "", seo_description: "", seo_keywords: "" });
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tool
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[640px]">
                <DialogHeader>
                  <DialogTitle>{editingTool ? "Edit Tool" : "Add Tool"}</DialogTitle>
                </DialogHeader>
                <Form {...toolForm}>
                  <form onSubmit={toolForm.handleSubmit((v) => saveToolMutation.mutate(v))} className="space-y-4">
                    <FormField
                      control={toolForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={toolForm.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={toolForm.control}
                      name="image"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">SEO Settings</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const name = toolForm.getValues("name");
                            const seo = generateSEO(name);
                            toolForm.setValue("seo_title", seo.seo_title);
                            toolForm.setValue("seo_description", seo.seo_description);
                            toolForm.setValue("seo_keywords", seo.seo_keywords);
                          }}
                        >
                          Auto Generate
                        </Button>
                      </div>

                      <FormField
                        control={toolForm.control}
                        name="seo_title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Page title for search engines" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={toolForm.control}
                        name="seo_description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="min-h-[60px]" placeholder="Meta description for search engines" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={toolForm.control}
                        name="seo_keywords"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Keywords</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Comma-separated keywords" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={saveToolMutation.isPending}>
                      {saveToolMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Tool
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {toolsList.map((t: RepairTool) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingTool(t);
                          toolForm.reset({ name: t.name ?? "", url: t.url ?? "", image: t.image ?? "" });
                          setToolDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => {
                          if (confirm("Delete this tool?")) deleteToolMutation.mutate(t.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {toolsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-10 text-sm text-muted-foreground">
                      No tools yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Parts */}
        <TabsContent value="parts" className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Parts can be attached to guides.</div>
            <Dialog open={partDialogOpen} onOpenChange={setPartDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingPart(null);
                    partForm.reset({ name: "", url: "", image: "", estimated_price: null, seo_title: "", seo_description: "", seo_keywords: "" });
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Part
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[640px]">
                <DialogHeader>
                  <DialogTitle>{editingPart ? "Edit Part" : "Add Part"}</DialogTitle>
                </DialogHeader>
                <Form {...partForm}>
                  <form onSubmit={partForm.handleSubmit((v) => savePartMutation.mutate(v))} className="space-y-4">
                    <FormField
                      control={partForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={partForm.control}
                      name="estimated_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Price (Rs.)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={partForm.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={partForm.control}
                      name="image"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">SEO Settings</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const name = partForm.getValues("name");
                            const seo = generateSEO(name);
                            partForm.setValue("seo_title", seo.seo_title);
                            partForm.setValue("seo_description", seo.seo_description);
                            partForm.setValue("seo_keywords", seo.seo_keywords);
                          }}
                        >
                          Auto Generate
                        </Button>
                      </div>

                      <FormField
                        control={partForm.control}
                        name="seo_title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Page title for search engines" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={partForm.control}
                        name="seo_description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="min-h-[60px]" placeholder="Meta description for search engines" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={partForm.control}
                        name="seo_keywords"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Keywords</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Comma-separated keywords" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={savePartMutation.isPending}>
                      {savePartMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Part
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partsList.map((p: RepairPart) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.estimated_price ? `Rs. ${Number(p.estimated_price).toLocaleString()}` : "—"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingPart(p);
                          partForm.reset({
                            name: p.name ?? "",
                            url: p.url ?? "",
                            image: p.image ?? "",
                            estimated_price: p.estimated_price ?? null,
                          });
                          setPartDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => {
                          if (confirm("Delete this part?")) deletePartMutation.mutate(p.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {partsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-sm text-muted-foreground">
                      No parts yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
