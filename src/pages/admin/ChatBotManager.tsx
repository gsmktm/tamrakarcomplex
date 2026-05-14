import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bot, Database, Eye, Loader2, MessageSquare, Plus, Save, Send, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { askChatbot, defaultChatbotConfig, deleteTrainingItem, fetchChatbotOverview, fetchPublicChatbotConfig, fetchTrainingItems, normalizeChatbotConfig, saveChatbotConfig, upsertTrainingItem, type ChatbotConfig, type ChatbotTrainingItem } from "@/lib/chatbot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const [config, setConfig] = useState<ChatbotConfig>(defaultChatbotConfig);
  const [trainingForm, setTrainingForm] = useState<TrainingForm>(blankTraining);
  const [previewQuestion, setPreviewQuestion] = useState("iPhone price");
  const [previewAnswer, setPreviewAnswer] = useState<string>("");

  const configQuery = useQuery({
    queryKey: ["admin_chatbot_config_complete"],
    queryFn: fetchPublicChatbotConfig,
  });

  const overviewQuery = useQuery({
    queryKey: ["admin_chatbot_overview"],
    queryFn: fetchChatbotOverview,
    refetchInterval: 30000,
  });

  const trainingQuery = useQuery({
    queryKey: ["admin_chatbot_training_items"],
    queryFn: fetchTrainingItems,
  });

  useEffect(() => {
    if (configQuery.data) setConfig(normalizeChatbotConfig(configQuery.data));
  }, [configQuery.data]);

  const stats = overviewQuery.data;
  const latestSessions = useMemo(() => stats?.latest_sessions || [], [stats]);

  const saveConfigMutation = useMutation({
    mutationFn: () => saveChatbotConfig(config),
    onSuccess: () => {
      toast.success("Chat support configuration saved");
      queryClient.invalidateQueries({ queryKey: ["admin_chatbot_config_complete"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Config save failed"),
  });

  const saveTrainingMutation = useMutation({
    mutationFn: async () => {
      if (!trainingForm.question.trim() || !trainingForm.answer.trim()) {
        throw new Error("Question and answer are required");
      }
      await upsertTrainingItem({
        id: trainingForm.id || undefined,
        question: trainingForm.question,
        answer: trainingForm.answer,
        category: trainingForm.category,
        keywords: trainingForm.keywords.split(",").map((item) => item.trim()).filter(Boolean),
        priority: Number(trainingForm.priority) || 100,
        is_active: trainingForm.is_active,
      });
    },
    onSuccess: () => {
      toast.success("Training answer saved");
      setTrainingForm(blankTraining);
      queryClient.invalidateQueries({ queryKey: ["admin_chatbot_training_items"] });
      queryClient.invalidateQueries({ queryKey: ["admin_chatbot_overview"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Training save failed"),
  });

  const deleteTrainingMutation = useMutation({
    mutationFn: deleteTrainingItem,
    onSuccess: () => {
      toast.success("Training item deleted");
      queryClient.invalidateQueries({ queryKey: ["admin_chatbot_training_items"] });
      queryClient.invalidateQueries({ queryKey: ["admin_chatbot_overview"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Delete failed"),
  });

  const previewMutation = useMutation({
    mutationFn: () => askChatbot({
      question: previewQuestion,
      customer: { name: "Suadmin Preview", phone: "9800000000", email: "preview@tamrakarcomplex.com" },
      sourceUrl: "/suadmin/chatbot-preview",
    }),
    onSuccess: (data) => setPreviewAnswer(data.answer || data.error || "No answer"),
    onError: (error) => setPreviewAnswer(error instanceof Error ? error.message : "Preview failed"),
  });

  if (configQuery.isLoading) {
    return <Loader2 className="mx-auto mt-20 h-8 w-8 animate-spin" />;
  }

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
        <StatCard icon={<Database />} label="Training Items" value={stats?.training_items} />
        <StatCard icon={<Bot />} label="Today Messages" value={stats?.today_messages} />
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

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
                <ToggleRow label="Require Contact" note="Ask name and phone before answering" value={config.require_contact} onChange={(v) => setConfig({ ...config, require_contact: v })} />
                <ToggleRow label="Auto Create Chat Customer" note="Save name, phone, email as support account/lead" value={config.auto_create_customer} onChange={(v) => setConfig({ ...config, auto_create_customer: v })} />
                <div className="space-y-2">
                  <Label>Support Display Name</Label>
                  <Input value={config.support_name} onChange={(e) => setConfig({ ...config, support_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Welcome Message</Label>
                  <Textarea rows={3} value={config.welcome_message} onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Fallback Message</Label>
                  <Textarea rows={3} value={config.fallback_message} onChange={(e) => setConfig({ ...config, fallback_message: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Answer Sources</CardTitle>
                <CardDescription>Choose which database sections chatbot searches.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(config.sources_enabled).map(([key, value]) => (
                  <ToggleRow
                    key={key}
                    label={sourceLabel(key)}
                    note={sourceNote(key)}
                    value={value}
                    onChange={(v) => setConfig({ ...config, sources_enabled: { ...config.sources_enabled, [key]: v } })}
                  />
                ))}
                <ToggleRow label="Show Store Contacts" note="Add store contact suggestions in answers" value={config.show_store_contacts} onChange={(v) => setConfig({ ...config, show_store_contacts: v })} />
                <div className="space-y-2">
                  <Label>Training Prompt / Behavior Rule</Label>
                  <Textarea rows={5} value={config.training_prompt} onChange={(e) => setConfig({ ...config, training_prompt: e.target.value })} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Business Contact Shown to Chatbot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <InputWithLabel label="Phone" value={String(config.business_info.phone || "")} onChange={(value) => setConfig({ ...config, business_info: { ...config.business_info, phone: value } })} />
              <InputWithLabel label="Email" value={String(config.business_info.email || "")} onChange={(value) => setConfig({ ...config, business_info: { ...config.business_info, email: value } })} />
              <InputWithLabel label="Location" value={String(config.business_info.location || "")} onChange={(value) => setConfig({ ...config, business_info: { ...config.business_info, location: value } })} />
              <InputWithLabel label="Hours" value={String(config.business_info.hours || "")} onChange={(value) => setConfig({ ...config, business_info: { ...config.business_info, hours: value } })} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{trainingForm.id ? "Edit Training Answer" : "Add Training Answer"}</CardTitle>
              <CardDescription>Use this for fixed answers like exchange policy, repair process, warranty, delivery or store rules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <InputWithLabel label="Category" value={trainingForm.category} onChange={(value) => setTrainingForm({ ...trainingForm, category: value })} />
                <InputWithLabel label="Keywords comma separated" value={trainingForm.keywords} onChange={(value) => setTrainingForm({ ...trainingForm, keywords: value })} />
                <InputWithLabel label="Priority" value={String(trainingForm.priority)} onChange={(value) => setTrainingForm({ ...trainingForm, priority: Number(value) || 100 })} />
              </div>
              <div className="space-y-2">
                <Label>Customer Question / Trigger</Label>
                <Input value={trainingForm.question} onChange={(e) => setTrainingForm({ ...trainingForm, question: e.target.value })} placeholder="Example: exchange phone" />
              </div>
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Textarea rows={5} value={trainingForm.answer} onChange={(e) => setTrainingForm({ ...trainingForm, answer: e.target.value })} placeholder="Write the exact answer customers should receive." />
              </div>
              <ToggleRow label="Active" note="Turn off to hide this training answer" value={trainingForm.is_active} onChange={(v) => setTrainingForm({ ...trainingForm, is_active: v })} />
              <div className="flex gap-2">
                <Button onClick={() => saveTrainingMutation.mutate()} disabled={saveTrainingMutation.isPending}>
                  {saveTrainingMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Save Training
                </Button>
                {trainingForm.id && <Button variant="outline" onClick={() => setTrainingForm(blankTraining)}>Cancel Edit</Button>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Training Library</CardTitle>
            </CardHeader>
            <CardContent>
              <TrainingTable
                items={trainingQuery.data || []}
                onEdit={(item) => setTrainingForm({
                  id: item.id,
                  question: item.question,
                  answer: item.answer,
                  category: item.category || "general",
                  keywords: (item.keywords || []).join(", "),
                  priority: item.priority || 100,
                  is_active: item.is_active ?? true,
                })}
                onDelete={(id) => deleteTrainingMutation.mutate(id)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Chatbot Answer</CardTitle>
              <CardDescription>Preview uses real database RPC and creates a test chat session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={previewQuestion} onChange={(e) => setPreviewQuestion(e.target.value)} placeholder="Ask a customer question" />
                <Button onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending || !previewQuestion.trim()}>
                  {previewMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Test
                </Button>
              </div>
              {previewAnswer && <div className="rounded-lg border bg-muted p-4 text-sm whitespace-pre-line">{previewAnswer}</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Chat Requests</CardTitle>
              <CardDescription>Name, phone, email, question, answer and tracking code are saved here.</CardDescription>
            </CardHeader>
            <CardContent>
              <SessionTable rows={latestSessions} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChatBotManager;

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

const ToggleRow = ({ label, note, value, onChange }: { label: string; note: string; value: boolean; onChange: (value: boolean) => void }) => (
  <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
    <div>
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
);

const InputWithLabel = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const sourceLabel = (key: string) => ({
  products: "Products Table",
  articles: "Articles",
  guides: "Guides",
  content_pages: "Content Pages",
  device_catalog: "Device Catalog",
  official_prices: "Official Price List",
  store_offers: "Store Marketplace Offers",
  training: "Suadmin Training Answers",
}[key] || key);

const sourceNote = (key: string) => ({
  products: "Search public product pages and prices",
  articles: "Use news/articles as answer source",
  guides: "Use buying guides and FAQ style content",
  content_pages: "Use pages like terms, repair, about",
  device_catalog: "Use model database for model matching",
  official_prices: "Use platform-controlled official price list",
  store_offers: "Use store-level price and stock offers",
  training: "Use manual training answers first",
}[key] || "Database source");

const TrainingTable = ({ items, onEdit, onDelete }: { items: ChatbotTrainingItem[]; onEdit: (item: ChatbotTrainingItem) => void; onDelete: (id: string) => void }) => (
  <div className="overflow-x-auto rounded border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Question</TableHead>
          <TableHead>Answer</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell><Badge variant={item.is_active ? "default" : "secondary"}>{item.is_active ? "Active" : "Off"}</Badge></TableCell>
            <TableCell className="max-w-[220px] text-xs font-medium">{item.question}</TableCell>
            <TableCell className="max-w-[380px] text-xs text-muted-foreground line-clamp-2">{item.answer}</TableCell>
            <TableCell className="text-xs">{item.category || "general"}</TableCell>
            <TableCell className="text-xs">{item.priority ?? 100}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(item)}><Eye className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="destructive" onClick={() => onDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {items.length === 0 && (
          <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No training items yet.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  </div>
);

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
