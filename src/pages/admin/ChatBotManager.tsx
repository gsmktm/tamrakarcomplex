import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Save, MessageSquare, Database, Globe, Newspaper, BookOpen, FileText, UserSquare2, ShieldCheck, List } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useMemo } from "react";

const ChatBotManager = () => {
  const queryClient = useQueryClient();
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [configId, setConfigId] = useState<string | null>(null);
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [requireContact, setRequireContact] = useState(false);
  const [supportName, setSupportName] = useState("Support");
  const [sourcesEnabled, setSourcesEnabled] = useState<Record<string, boolean>>({
    products: true,
    articles: true,
    guides: true,
    content_pages: true,
    device_catalog: true,
  });
  const [showStoreContacts, setShowStoreContacts] = useState(true);
  const filters = useMemo(() => ({ subjectLike: "chatbot" }), []);

  const { data: config, isLoading } = useQuery({
    queryKey: ["admin_chatbot_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chatbot_config")
        .select("*")
        .single();
      
      // If no config exists, return null (we'll create one)
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  useEffect(() => {
    if (config) {
      setWelcomeMessage(config.welcome_message || "");
      setIsActive(config.is_active || false);
      setConfigId(config.id);
    }
    const local = localStorage.getItem("chatbot-settings");
    if (local) {
      try {
        const parsed = JSON.parse(local) as { allowAnonymous?: boolean; requireContact?: boolean; supportName?: string; sourcesEnabled?: Record<string, boolean>; showStoreContacts?: boolean };
        if (typeof parsed.allowAnonymous === "boolean") setAllowAnonymous(parsed.allowAnonymous);
        if (typeof parsed.requireContact === "boolean") setRequireContact(parsed.requireContact);
        if (typeof parsed.supportName === "string") setSupportName(parsed.supportName);
        if (parsed.sourcesEnabled) {
          setSourcesEnabled(prev => ({ ...prev, ...parsed.sourcesEnabled }));
        }
        if (typeof parsed.showStoreContacts === "boolean") setShowStoreContacts(parsed.showStoreContacts);
      } catch {
        // ignore
      }
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        welcome_message: welcomeMessage,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (configId) {
        const { error: updateError } = await supabase
          .from("chatbot_config")
          .update(payload)
          .eq("id", configId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("chatbot_config")
          .insert(payload);
        error = insertError;
      }

      if (error) throw error;
      localStorage.setItem("chatbot-settings", JSON.stringify({ allowAnonymous, requireContact, supportName, sourcesEnabled, showStoreContacts }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_chatbot_config"] });
      toast.success("Chatbot settings saved");
    },
    onError: (error) => {
      toast.error(`Error saving settings: ${error.message}`);
    },
  });

  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin mx-auto mt-20" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Chat Bot Manager</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Configuration
          </CardTitle>
          <CardDescription>
            Manage the behavior of the automated chat assistant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="active-mode">Active Status</Label>
              <span className="text-sm text-muted-foreground">
                Enable or disable the chatbot on the public site.
              </span>
            </div>
            <Switch
              id="active-mode"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcome-msg">Welcome Message</Label>
            <Input
              id="welcome-msg"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Hello! How can I help you today?"
            />
            <p className="text-xs text-muted-foreground">
              This message appears when a user opens the chat widget.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <Label>Allow Anonymous Users</Label>
              </div>
              <Switch checked={allowAnonymous} onCheckedChange={setAllowAnonymous} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <Label>Require Contact Details</Label>
              </div>
              <Switch checked={requireContact} onCheckedChange={setRequireContact} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <UserSquare2 className="h-4 w-4" />
                <Label>Support Display Name</Label>
              </div>
              <Input value={supportName} onChange={(e) => setSupportName(e.target.value)} placeholder="Support" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <Label>Answer Sources</Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-between gap-2 border rounded p-2">
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>Pages</span></div>
                  <Switch checked={sourcesEnabled.content_pages} onCheckedChange={(v) => setSourcesEnabled({ ...sourcesEnabled, content_pages: v })} />
                </label>
                <label className="flex items-center justify-between gap-2 border rounded p-2">
                  <div className="flex items-center gap-2"><Newspaper className="h-4 w-4" /><span>Articles</span></div>
                  <Switch checked={sourcesEnabled.articles} onCheckedChange={(v) => setSourcesEnabled({ ...sourcesEnabled, articles: v })} />
                </label>
                <label className="flex items-center justify-between gap-2 border rounded p-2">
                  <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><span>Guides</span></div>
                  <Switch checked={sourcesEnabled.guides} onCheckedChange={(v) => setSourcesEnabled({ ...sourcesEnabled, guides: v })} />
                </label>
                <label className="flex items-center justify-between gap-2 border rounded p-2">
                  <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /><span>Products & Catalog</span></div>
                  <Switch checked={sourcesEnabled.products && sourcesEnabled.device_catalog} onCheckedChange={(v) => setSourcesEnabled({ ...sourcesEnabled, products: v, device_catalog: v })} />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose where the chatbot searches when answering queries.
              </p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <Label>Show Store Contacts in Answers</Label>
                </div>
                <Switch checked={showStoreContacts} onCheckedChange={setShowStoreContacts} />
              </div>
            </div>
          </div>

          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Recent Chatbot Logs
          </CardTitle>
          <CardDescription>Shows recent questions and captured contact info.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChatbotLogs subjectLike={filters.subjectLike} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatBotManager;

const ChatbotLogs = ({ subjectLike }: { subjectLike: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["chatbot-logs", subjectLike],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .ilike("subject", `%${subjectLike}%`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    }
  });
  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  return (
    <div className="border rounded">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Question</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data || []).map((row: { id: string; created_at: string; message: string; subject: string }) => {
            let payload: { name?: string; email?: string; phone?: string; question?: string } = {};
            try { payload = JSON.parse(row.message || "{}"); } catch { /* ignore */ }
            return (
              <TableRow key={row.id}>
                <TableCell className="text-xs">{new Date(row.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{payload.name || "-"}</TableCell>
                <TableCell className="text-xs">{payload.email || "-"}</TableCell>
                <TableCell className="text-xs">{payload.phone || "-"}</TableCell>
                <TableCell className="text-xs">{payload.question || row.subject || "-"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
