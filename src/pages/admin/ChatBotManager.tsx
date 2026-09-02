import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bot, ChevronLeft, ChevronRight, Database, Edit2, Eye, Filter,
  Loader2, MessageSquare, Plus, Save, Search, Send, ShieldCheck,
  Tag, Trash2, UserPlus, X, CheckSquare, Square, ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  askChatbot, defaultChatbotConfig, deleteTrainingItem,
  fetchChatbotOverview, fetchPublicChatbotConfig, fetchTrainingItems,
  normalizeChatbotConfig, saveChatbotConfig, upsertTrainingItem,
  type ChatbotConfig, type ChatbotTrainingItem,
} from "@/lib/chatbot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const PAGE_SIZE = 20;

const blankTraining = {
  id: "",
  question: "",
  answer: "",
  category: "general",
  keywords: "",
  priority: 100,
  is_active: true,
};

type TrainingForm = typeof blankTraining;

const ChatBotManager = () => {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);

  const [config, setConfig] = useState<ChatbotConfig>(defaultChatbotConfig);
  const [trainingForm, setTrainingForm] = useState<TrainingForm>(blankTraining);
  const [previewQuestion, setPreviewQuestion] = useState("iPhone price");
  const [previewAnswer, setPreviewAnswer] = useState<string>("");

  // Training list state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"priority" | "question" | "category" | "created">("priority");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const configQuery = useQuery({ queryKey: ["admin_chatbot_config_complete"], queryFn: fetchPublicChatbotConfig });
  const overviewQuery = useQuery({ queryKey: ["admin_chatbot_overview"], queryFn: fetchChatbotOverview, refetchInterval: 30000, retry: 1 });
  const trainingQuery = useQuery({ queryKey: ["admin_chatbot_training_items"], queryFn: fetchTrainingItems });

  useEffect(() => { if (configQuery.data) setConfig(normalizeChatbotConfig(configQuery.data)); }, [configQuery.data]);

  const allItems = useMemo(() => trainingQuery.data ?? [], [trainingQuery.data]);
  const stats = overviewQuery.data;

  // Unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(allItems.map((i) => i.category || "general"));
    return ["all", ...Array.from(cats).sort()];
  }, [allItems]);

  // Filtered + sorted items
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allItems
      .filter((item) => {
        const matchSearch = !q ||
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q) ||
          (item.category || "").toLowerCase().includes(q) ||
          (item.keywords || []).some((k) => k.toLowerCase().includes(q));
        const matchCat = categoryFilter === "all" || (item.category || "general") === categoryFilter;
        return matchSearch && matchCat;
      })
      .sort((a, b) => {
        if (sortBy === "priority") return (a.priority ?? 100) - (b.priority ?? 100);
        if (sortBy === "question") return a.question.localeCompare(b.question);
        if (sortBy === "category") return (a.category || "").localeCompare(b.category || "");
        return 0;
      });
  }, [allItems, search, categoryFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageIds = new Set(pageItems.map((i) => i.id));
  const allPageSelected = pageItems.length > 0 && pageItems.every((i) => selected.has(i.id));

  // Reset page on filter change
  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, categoryFilter, sortBy]);

  const saveConfigMutation = useMutation({
    mutationFn: () => saveChatbotConfig(config),
    onSuccess: () => { toast.success("Chat support configuration saved"); queryClient.invalidateQueries({ queryKey: ["admin_chatbot_config_complete"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Config save failed"),
  });

  const saveTrainingMutation = useMutation({
    mutationFn: async () => {
      if (!trainingForm.question.trim() || !trainingForm.answer.trim()) throw new Error("Question and answer are required");
      await upsertTrainingItem({
        id: trainingForm.id || undefined,
        question: trainingForm.question,
        answer: trainingForm.answer,
        category: trainingForm.category,
        keywords: trainingForm.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        priority: Number(trainingForm.priority) || 100,
        is_active: trainingForm.is_active,
      });
    },
    onSuccess: () => {
      toast.success(trainingForm.id ? "Training item updated" : "Training item added");
      setTrainingForm(blankTraining);
      queryClient.invalidateQueries({ queryKey: ["admin_chatbot_training_items"] });
      queryClient.invalidateQueries({ queryKey: ["admin_chatbot_overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const deleteTrainingMutation = useMutation({
    mutationFn: deleteTrainingItem,
    onSuccess: () => {
      toast.success("Deleted");
      setDeleteTarget(null);
      setSelected((prev) => { const s = new Set(prev); s.delete(deleteTarget!); return s; });
      queryClient.invalidateQueries({ queryKey: ["admin_chatbot_training_items"] });
      queryClient.invalidateQueries({ queryKey: ["admin_chatbot_overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => { for (const id of ids) await deleteTrainingItem(id); },
    onSuccess: () => {
      toast.success(`${selected.size} items deleted`);
      setSelected(new Set());
      setBulkDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin_chatbot_training_items"] });
      queryClient.invalidateQueries({ queryKey: ["admin_chatbot_overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Bulk delete failed"),
  });

  const bulkToggleMutation = useMutation({
    mutationFn: async ({ ids, active }: { ids: string[]; active: boolean }) => {
      const items = allItems.filter((i) => ids.includes(i.id));
      for (const item of items) {
        await upsertTrainingItem({ id: item.id, question: item.question, answer: item.answer, category: item.category, keywords: item.keywords, priority: item.priority, is_active: active });
      }
    },
    onSuccess: (_d, { active }) => {
      toast.success(`${selected.size} items ${active ? "activated" : "deactivated"}`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin_chatbot_training_items"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Bulk toggle failed"),
  });

  const previewMutation = useMutation({
    mutationFn: () => askChatbot({ question: previewQuestion, customer: { name: "Suadmin Preview", email: "preview@tamrakarcomplex.com" }, sourceUrl: "/suadmin/chatbot-preview" }),
    onSuccess: (data) => setPreviewAnswer(data.answer || data.error || "No answer"),
    onError: (e) => setPreviewAnswer(e instanceof Error ? e.message : "Preview failed"),
  });

  const handleEdit = (item: ChatbotTrainingItem) => {
    setTrainingForm({
      id: item.id,
      question: item.question,
      answer: item.answer,
      category: item.category || "general",
      keywords: (item.keywords || []).join(", "),
      priority: item.priority || 100,
      is_active: item.is_active ?? true,
    });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
      } else {
        s.add(id);
      }
      return s;
    });
  };

  const togglePageAll = () => {
    if (allPageSelected) {
      setSelected((prev) => { const s = new Set(prev); pageIds.forEach((id) => s.delete(id)); return s; });
    } else {
      setSelected((prev) => { const s = new Set(prev); pageIds.forEach((id) => s.add(id)); return s; });
    }
  };

  if (configQuery.isLoading) return <Loader2 className="mx-auto mt-20 h-8 w-8 animate-spin" />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chat Support Command Center</h1>
          <p className="text-muted-foreground">Setup, train, preview and monitor the customer chatbot.</p>
        </div>
        <Button onClick={() => saveConfigMutation.mutate()} disabled={saveConfigMutation.isPending}>
          {saveConfigMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save All Settings
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={<UserPlus />} label="Customers" value={stats?.total_customers} />
        <StatCard icon={<MessageSquare />} label="Open Requests" value={stats?.open_sessions} />
        <StatCard icon={<ShieldCheck />} label="Answered" value={stats?.answered_sessions} />
        <StatCard icon={<Database />} label="Training Items" value={allItems.length} />
        <StatCard icon={<Bot />} label="Today Messages" value={stats?.today_messages} />
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="training">Training ({allItems.length})</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* ── SETTINGS ── */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Chat Setup</CardTitle>
                <CardDescription>Public chatbot name, welcome answer and fallback answer.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ToggleRow label="Chat Active" note="Show chatbot on public website" value={config.is_active} onChange={(v) => setConfig({ ...config, is_active: v })} />
                <ToggleRow label="Allow Anonymous" note="Let visitors ask without login" value={config.allow_anonymous} onChange={(v) => setConfig({ ...config, allow_anonymous: v })} />
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                  Customer contact collection is disabled. The chatbot answers without requesting a phone number.
                </div>
                <div className="space-y-2"><Label>Support Display Name</Label><Input value={config.support_name} onChange={(e) => setConfig({ ...config, support_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Welcome Message</Label><Textarea rows={3} value={config.welcome_message} onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })} /></div>
                <div className="space-y-2"><Label>Fallback Message</Label><Textarea rows={3} value={config.fallback_message} onChange={(e) => setConfig({ ...config, fallback_message: e.target.value })} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Answer Sources</CardTitle>
                <CardDescription>Choose which database sections chatbot searches.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(config.sources_enabled).map(([key, value]) => (
                  <ToggleRow key={key} label={sourceLabel(key)} note={sourceNote(key)} value={value}
                    onChange={(v) => setConfig({ ...config, sources_enabled: { ...config.sources_enabled, [key]: v } })} />
                ))}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                  Privacy lock: individual shop names, details, locations, and phone/WhatsApp numbers are always hidden from chatbot answers.
                </div>
                <div className="space-y-2">
                  <Label>Training Prompt / Behavior Rule</Label>
                  <Textarea rows={5} value={config.training_prompt} onChange={(e) => setConfig({ ...config, training_prompt: e.target.value })} />
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Public Support Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <InputWithLabel label="Email" value={String(config.business_info.email || "")} onChange={(v) => setConfig({ ...config, business_info: { ...config.business_info, email: v } })} />
              <InputWithLabel label="Location" value={String(config.business_info.location || "")} onChange={(v) => setConfig({ ...config, business_info: { ...config.business_info, location: v } })} />
              <InputWithLabel label="Hours" value={String(config.business_info.hours || "")} onChange={(v) => setConfig({ ...config, business_info: { ...config.business_info, hours: v } })} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TRAINING ── */}
        <TabsContent value="training" className="space-y-4">
          {/* Add / Edit form */}
          <Card ref={formRef}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {trainingForm.id ? <><Edit2 className="h-4 w-4 text-amber-500" /> Edit Training Item</> : <><Plus className="h-4 w-4 text-green-500" /> Add Training Item</>}
              </CardTitle>
              <CardDescription>Fixed Q&amp;A pairs matched before database search. Use for policies, prices, locations, FAQs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={trainingForm.category} onChange={(e) => setTrainingForm({ ...trainingForm, category: e.target.value })} placeholder="e.g. exchange, repair, location" />
                </div>
                <div className="space-y-2">
                  <Label>Keywords <span className="text-muted-foreground text-xs">(comma separated)</span></Label>
                  <Input value={trainingForm.keywords} onChange={(e) => setTrainingForm({ ...trainingForm, keywords: e.target.value })} placeholder="e.g. exchange, trade, swap" />
                </div>
                <div className="space-y-2">
                  <Label>Priority <span className="text-muted-foreground text-xs">(lower = first)</span></Label>
                  <Input type="number" value={String(trainingForm.priority)} onChange={(e) => setTrainingForm({ ...trainingForm, priority: Number(e.target.value) || 100 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Customer Question / Trigger</Label>
                <Input value={trainingForm.question} onChange={(e) => setTrainingForm({ ...trainingForm, question: e.target.value })} placeholder="e.g. How do I exchange my old phone?" />
              </div>
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Textarea rows={5} value={trainingForm.answer} onChange={(e) => setTrainingForm({ ...trainingForm, answer: e.target.value })} placeholder="Write the exact answer customers should receive." />
              </div>
              <ToggleRow label="Active" note="Turn off to disable this training answer without deleting" value={trainingForm.is_active} onChange={(v) => setTrainingForm({ ...trainingForm, is_active: v })} />
              <div className="flex gap-2">
                <Button onClick={() => saveTrainingMutation.mutate()} disabled={saveTrainingMutation.isPending}>
                  {saveTrainingMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : trainingForm.id ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {trainingForm.id ? "Update Item" : "Add Item"}
                </Button>
                {trainingForm.id && (
                  <Button variant="outline" onClick={() => setTrainingForm(blankTraining)}>
                    <X className="mr-2 h-4 w-4" /> Cancel Edit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Library */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Training Library</CardTitle>
                  <CardDescription>{filtered.length} of {allItems.length} items shown</CardDescription>
                </div>
                {/* Bulk actions */}
                {selected.size > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950">
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">{selected.size} selected</span>
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => bulkToggleMutation.mutate({ ids: Array.from(selected), active: true })} disabled={bulkToggleMutation.isPending}>
                      <ToggleRight className="h-3.5 w-3.5 text-green-600" /> Activate
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => bulkToggleMutation.mutate({ ids: Array.from(selected), active: false })} disabled={bulkToggleMutation.isPending}>
                      <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" /> Deactivate
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 gap-1 text-xs" onClick={() => setBulkDeleteOpen(true)}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelected(new Set())}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search question, answer, keyword…" value={search} onChange={(e) => setSearch(e.target.value)} />
                  {search && (
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c === "all" ? "All Categories" : c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priority">Sort: Priority</SelectItem>
                    <SelectItem value="question">Sort: Question</SelectItem>
                    <SelectItem value="category">Sort: Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {trainingQuery.isLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={allPageSelected}
                              onCheckedChange={togglePageAll}
                              aria-label="Select all on page"
                            />
                          </TableHead>
                          <TableHead className="w-16">Status</TableHead>
                          <TableHead>Question</TableHead>
                          <TableHead>Answer</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Keywords</TableHead>
                          <TableHead className="w-16 text-center">Pri</TableHead>
                          <TableHead className="w-24 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageItems.map((item) => (
                          <TableRow key={item.id} className={selected.has(item.id) ? "bg-muted/40" : ""}>
                            <TableCell>
                              <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.is_active ? "default" : "secondary"} className="text-[10px]">
                                {item.is_active ? "On" : "Off"}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <p className="text-xs font-medium leading-snug">{item.question}</p>
                            </TableCell>
                            <TableCell className="max-w-[300px]">
                              <p className="line-clamp-2 text-xs text-muted-foreground">{item.answer}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] capitalize">{item.category || "general"}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[160px]">
                              <div className="flex flex-wrap gap-1">
                                {(item.keywords || []).slice(0, 3).map((kw) => (
                                  <span key={kw} className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                                    <Tag className="h-2.5 w-2.5" />{kw}
                                  </span>
                                ))}
                                {(item.keywords || []).length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">+{(item.keywords || []).length - 3}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-xs font-semibold tabular-nums">{item.priority ?? 100}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleEdit(item)} title="Edit">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(item.id)} title="Delete">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {pageItems.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                              {search || categoryFilter !== "all" ? "No items match your filters." : "No training items yet. Add one above."}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t px-4 py-3">
                      <p className="text-xs text-muted-foreground">
                        Page {page} of {totalPages} · {filtered.length} items
                      </p>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                          const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3;
                          if (p < 1 || p > totalPages) return null;
                          return (
                            <Button key={p} size="sm" variant={p === page ? "default" : "outline"} className="h-8 w-8 p-0 text-xs" onClick={() => setPage(p)}>
                              {p}
                            </Button>
                          );
                        })}
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PREVIEW ── */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Chatbot Answer</CardTitle>
              <CardDescription>Preview uses the real database and the same privacy-filtered logic as the public widget.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={previewQuestion} onChange={(e) => setPreviewQuestion(e.target.value)} placeholder="Ask a customer question" onKeyDown={(e) => e.key === "Enter" && !previewMutation.isPending && previewQuestion.trim() && previewMutation.mutate()} />
                <Button onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending || !previewQuestion.trim()}>
                  {previewMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Test
                </Button>
              </div>
              {previewAnswer && (
                <div className="rounded-lg border bg-muted p-4 text-sm whitespace-pre-line">{previewAnswer}</div>
              )}
              {/* Quick test buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                {["iPhone 16 price", "exchange phone", "repair screen", "shop phone number", "EMI options", "warranty policy", "sell phone"].map((q) => (
                  <Button key={q} size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setPreviewQuestion(q); setTimeout(() => previewMutation.mutate(), 50); }}>
                    {q}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LOGS ── */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Chat Requests</CardTitle>
              <CardDescription>Latest sessions with tracking code, status, customer and Q&amp;A.</CardDescription>
            </CardHeader>
            <CardContent>
              <SessionTable rows={stats?.latest_sessions || []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete single confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete training item?</AlertDialogTitle>
            <AlertDialogDescription>This removes the Q&amp;A pair permanently. The chatbot will no longer use this answer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && deleteTrainingMutation.mutate(deleteTarget)} disabled={deleteTrainingMutation.isPending}>
              {deleteTrainingMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} training items?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes all selected Q&amp;A pairs. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => bulkDeleteMutation.mutate(Array.from(selected))} disabled={bulkDeleteMutation.isPending}>
              {bulkDeleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Delete {selected.size} Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatBotManager;

// ── Sub-components ──

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number }) => (
  <Card>
    <CardContent className="flex items-center gap-3 p-4">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      <div>
        <div className="text-2xl font-bold">{value ?? 0}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </CardContent>
  </Card>
);

const ToggleRow = ({ label, note, value, onChange }: { label: string; note: string; value: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
    <div>
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
);

const InputWithLabel = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const sourceLabel = (key: string) => ({ products: "Products Table", articles: "Articles", guides: "Guides", content_pages: "Content Pages", device_catalog: "Device Catalog", official_prices: "Official Price List", store_offers: "Store Marketplace Offers", training: "Suadmin Training Answers" }[key] || key);
const sourceNote = (key: string) => ({ products: "Search public product pages and prices", articles: "Use news/articles as answer source", guides: "Use buying guides and FAQ style content", content_pages: "Use pages like terms, repair, about", device_catalog: "Use model database for model matching", official_prices: "Use platform-controlled official price list", store_offers: "Use store-level price and stock offers", training: "Use manual training answers first" }[key] || "Database source");

const SessionTable = ({ rows }: { rows: Array<Record<string, unknown>> }) => (
  <div className="overflow-x-auto rounded border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tracking</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Question</TableHead>
          <TableHead>Answer</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={String(row.id)}>
            <TableCell className="text-xs font-semibold">{String(row.tracking_code || "-")}</TableCell>
            <TableCell><Badge variant={String(row.status) === "answered" ? "default" : "secondary"}>{String(row.status || "open")}</Badge></TableCell>
            <TableCell className="text-xs">{String(row.name || row.email || "Guest")}</TableCell>
            <TableCell className="text-xs">{String(row.phone || "-")}</TableCell>
            <TableCell className="max-w-[260px] text-xs line-clamp-2">{String(row.last_question || "-")}</TableCell>
            <TableCell className="max-w-[320px] text-xs text-muted-foreground line-clamp-2">{String(row.last_answer || "-")}</TableCell>
            <TableCell className="text-xs">{row.created_at ? new Date(String(row.created_at)).toLocaleString() : "-"}</TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No chat requests yet.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  </div>
);
