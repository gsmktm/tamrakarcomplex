import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, X, Phone, Mail, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { DeviceCatalogRow, StoreRow } from "@/types/app";

type ChatbotSettings = {
  allowAnonymous: boolean;
  requireContact: boolean;
  supportName: string;
  showStoreContacts: boolean;
  sourcesEnabled: {
    products: boolean;
    articles: boolean;
    guides: boolean;
    content_pages: boolean;
    device_catalog: boolean;
  };
};

type ChatInfoResult = {
  kind: "answer" | "stores";
  title: string;
  text: string;
};

type ChatLinkResult = {
  kind: "product" | "article" | "guide" | "page" | "device";
  title: string;
  excerpt?: string;
  href: string;
  price?: string;
};

type ChatResult = ChatInfoResult | ChatLinkResult;

function isChatLinkResult(result: ChatResult): result is ChatLinkResult {
  return result.kind !== "answer" && result.kind !== "stores";
}

const defaultChatbotSettings: ChatbotSettings = {
  allowAnonymous: true,
  requireContact: false,
  supportName: "Support",
  showStoreContacts: true,
  sourcesEnabled: {
    products: true,
    articles: true,
    guides: true,
    content_pages: true,
    device_catalog: true,
  },
};

interface ChatWidgetProps {
    settings?: {
        position?: "bottom-right" | "bottom-left";
    };
}

export const ChatWidget = ({ settings: propSettings = {} }: ChatWidgetProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ChatResult[]>([]);
  const [welcome, setWelcome] = useState("Hello! How can I help you today?");
  const [isActive, setIsActive] = useState(true);
  const [supportName, setSupportName] = useState("Support");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  const positionClass = propSettings.position === "bottom-left" ? "left-4" : "right-4";

  const chatbotSettings = useMemo(() => {
    try {
      const raw = localStorage.getItem("chatbot-settings");
      return raw ? (JSON.parse(raw) as ChatbotSettings) : defaultChatbotSettings;
    } catch {
      return defaultChatbotSettings;
    }
  }, []);

  const { data: config } = useQuery({
    queryKey: ["chatbot_config_public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chatbot_config").select("*").single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    }
  });

  useEffect(() => {
    if (config) {
      setWelcome(config.welcome_message || welcome);
      setIsActive(!!config.is_active);
    }
    setSupportName(chatbotSettings.supportName || "Support");
    try {
      const raw = localStorage.getItem("chatbot-profile");
      const p = raw ? JSON.parse(raw) : {};
      setName(p.name || "");
      setEmail(p.email || "");
      setPhone(p.phone || "");
    } catch {
      // Ignore malformed local chatbot profile data.
    }
  }, [config, chatbotSettings, welcome]);

  const canUse = isActive && (chatbotSettings.allowAnonymous || !!user);

  const ask = async () => {
    if (!question.trim()) return;
    if (chatbotSettings.requireContact && !phone) {
      setProfileOpen(true);
      return;
    }
    setLoading(true);
    setResults([]);
    const q = question.trim();
    const like = `%${q}%`;

    type ChatQueryResult = ChatLinkResult[] | Pick<StoreRow, "name" | "phone" | "location">[];
    const queries: Array<PromiseLike<ChatQueryResult>> = [];
    const enabled: ChatbotSettings["sourcesEnabled"] = {
      ...defaultChatbotSettings.sourcesEnabled,
      ...(chatbotSettings.sourcesEnabled ?? {}),
    };

    if (enabled.products) {
      queries.push(
        supabase
          .from("products")
          .select("name,slug,price,description")
          .ilike("name", like)
          .limit(5)
          .then(({ data, error }) => {
            if (error) return [];
            return (data ?? []).map((product) => ({
              kind: "product" as const,
              title: product.name,
              excerpt: product.description || undefined,
              href: `/product/${product.slug}`,
              price: product.price,
            }));
          })
      );
    }
    if (enabled.articles) {
      queries.push(
        supabase
          .from("articles")
          .select("title,slug,excerpt")
          .ilike("title", like)
          .limit(5)
          .then(({ data, error }) => {
            if (error) return [];
            return (data ?? []).map((article) => ({
              kind: "article" as const,
              title: article.title,
              excerpt: article.excerpt || undefined,
              href: `/article/${article.slug}`,
            }));
          })
      );
    }
    if (enabled.guides) {
      queries.push(
        supabase
          .from("guides")
          .select("title,slug,excerpt")
          .ilike("title", like)
          .limit(5)
          .then(({ data, error }) => {
            if (error) return [];
            return (data ?? []).map((guide) => ({
              kind: "guide" as const,
              title: guide.title,
              excerpt: guide.excerpt || undefined,
              href: `/guide/${guide.slug}`,
            }));
          })
      );
    }
    if (enabled.content_pages) {
      queries.push(
        supabase
          .from("content_pages")
          .select("title,slug,content")
          .ilike("title", like)
          .limit(5)
          .then(({ data, error }) => {
            if (error) return [];
            return (data ?? []).map((page) => ({
              kind: "page" as const,
              title: page.title,
              excerpt: typeof page.content === "string" ? page.content.slice(0, 160) : undefined,
              href: `/${page.slug}`,
            }));
          })
      );
    }
    if (enabled.device_catalog) {
      queries.push(
        supabase
          .from("device_catalog")
          .select("brand,model,canonical_slug")
          .ilike("model", like)
          .limit(5)
          .then(({ data, error }) => {
            if (error) return [];
            return (data ?? []).map((device: Pick<DeviceCatalogRow, "brand" | "model" | "canonical_slug">) => ({
              kind: "device" as const,
              title: `${device.brand} ${device.model}`.trim(),
              excerpt: "Open the valuation estimator for pricing guidance.",
              href: "/valuation-estimator",
            }));
          })
      );
    }
    // Stores for contact/location
    if (chatbotSettings.showStoreContacts) {
      queries.push(
        supabase.from("stores").select("name,phone,location").limit(3).then(({ data, error }) => {
          if (error) return [];
          return ((data ?? []) as unknown) as Pick<StoreRow, "name" | "phone" | "location">[];
        })
      );
    }

    try {
      const responses = await Promise.all(queries);
      const items: ChatLinkResult[] = [];
      let stores: Pick<StoreRow, "name" | "phone" | "location">[] = [];
      responses.forEach((res) => {
        if (Array.isArray(res) && res.length > 0 && "phone" in res[0]) {
          stores = res as Pick<StoreRow, "name" | "phone" | "location">[];
        } else if (Array.isArray(res)) {
          items.push(...(res as ChatLinkResult[]));
        }
      });
      // Compose an auto answer if price/product present
      const product = items.find((item): item is ChatLinkResult => item.kind === "product" && typeof item.price === "string");
      const autoAnswer: ChatInfoResult[] = [];
      if (product) {
        autoAnswer.push({
            kind: "answer",
            title: "Price Info",
            text: `Price of ${product.title} is ${product.price}.`,
        });
        if (stores.length) {
            const storeLines = stores.map((store) => `${store.name} · ${store.phone}${store.location ? ` · ${store.location}` : ""}`);
            autoAnswer.push({
            kind: "stores",
            title: "Store Contacts",
            text: `Contact stores:\n- ${storeLines.join("\n- ")}`,
            });
        }
      }

      // Add stores if found even without product match (optional enhancement)
      if (!product && stores.length > 0) {
           const storeLines = stores.map((store) => `${store.name} · ${store.phone}${store.location ? ` · ${store.location}` : ""}`);
           autoAnswer.push({
            kind: "stores",
            title: "Store Contacts",
            text: `Contact stores:\n- ${storeLines.join("\n- ")}`,
            });
      }

      const final = [...autoAnswer, ...items];
      // Filter duplicates or limit
      setResults(final.length > 0 ? final : []);

      // Log interaction
      await supabase.from("contact_messages").insert({
        name: name || user?.user_metadata?.full_name || "Guest",
        email: email || user?.email || null,
        subject: "chatbot: question",
        message: JSON.stringify({
          question: q,
          phone,
          results_count: final.length,
          product: product?.title || null,
          price: product?.price || null,
        }),
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canUse) return null;

  return (
    <>
      {!open && (
        <Button
          className={cn(
              "fixed bottom-20 z-40 rounded-full h-12 w-12 p-0 shadow-lg bg-primary text-primary-foreground hover:scale-105 transition-transform",
              positionClass
          )}
          onClick={() => setOpen(true)}
          aria-label="Open Chat"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}
      {open && (
        <Card className={cn(
            "fixed bottom-20 z-40 w-[340px] shadow-2xl border-2",
            positionClass
        )}>
          <div className="p-3 border-b bg-gradient-to-r from-primary/10 to-secondary/20">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{supportName}</div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{welcome}</div>
            <div className="mt-2 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setProfileOpen((v) => !v)}>
                {profileOpen ? "Hide Contact" : "Add Contact"}
              </Button>
            </div>
            {profileOpen && (
              <div className="mt-2 grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  <Input placeholder="Mobile" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="flex items-center justify-end">
                  <Button
                    size="sm"
                    onClick={async () => {
                      localStorage.setItem("chatbot-profile", JSON.stringify({ name, email, phone }));
                      await supabase.from("contact_messages").insert({
                        name: name || "Guest",
                        email: email || null,
                        subject: "chatbot: profile",
                        message: JSON.stringify({ name, email, phone }),
                      });
                      setProfileOpen(false);
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="p-3 space-y-3 max-h-[420px] overflow-y-auto">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </div>
            )}
            {!loading && results.length === 0 && (
              <div className="text-xs text-muted-foreground">Ask about products, articles, guides or pages.</div>
            )}
            {!loading && results.length > 0 && (
              <div className="space-y-2">
	                {results.slice(0, 8).map((item, idx) => {
	                  return (
	                    <div
	                      key={idx}
	                      className={cn(
	                        "border rounded p-2",
	                        item.kind === "answer" || item.kind === "stores" ? "bg-secondary/40" : "",
	                      )}
	                    >
	                      <div className="font-medium text-sm">{item.title}</div>
	                      {isChatLinkResult(item) ? (
	                        <>
	                          {item.excerpt ? (
	                            <div className="text-xs text-muted-foreground line-clamp-2">{item.excerpt}</div>
	                          ) : null}
	                          <div className="mt-1 text-xs">
	                            <a href={item.href} className="text-primary hover:underline">
	                              View
	                            </a>
	                          </div>
	                        </>
	                      ) : (
	                        <div className="text-xs whitespace-pre-line">{item.text}</div>
	                      )}
	                    </div>
	                  );
	                })}
              </div>
            )}
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <Input
              placeholder="Type your question…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === "Enter") {
                      ask();
                  }
              }}
            />
            <Button onClick={ask} disabled={loading || !question.trim()}>
              Ask
            </Button>
          </div>
        </Card>
      )}
    </>
  );
};
