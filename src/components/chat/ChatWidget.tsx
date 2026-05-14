import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { askChatbot, fetchPublicChatbotConfig, normalizeChatbotConfig, type ChatbotAnswer } from "@/lib/chatbot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, X, Phone, Mail, User, Send, Bot, CheckCircle2, ShoppingBag, Store, IndianRupee } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface ChatWidgetProps {
  settings?: {
    position?: "bottom-right" | "bottom-left";
  };
}

type UiMessage = {
  id: string;
  sender: "user" | "bot" | "system";
  text: string;
  payload?: ChatbotAnswer;
};

const STORAGE_PROFILE = "tamrakar-chat-profile";
const STORAGE_SESSION = "tamrakar-chat-session-id";

const formatMoney = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return `Rs. ${value.toLocaleString("en-IN")}`;
  return String(value);
};

const readProfile = () => {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE);
    return raw ? JSON.parse(raw) as { name?: string; email?: string; phone?: string } : {};
  } catch {
    return {};
  }
};

export const ChatWidget = ({ settings: propSettings = {} }: ChatWidgetProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const positionClass = propSettings.position === "bottom-left" ? "left-4" : "right-4";

  const { data: configRaw } = useQuery({
    queryKey: ["chatbot_config_public_complete"],
    queryFn: fetchPublicChatbotConfig,
    staleTime: 1000 * 60 * 2,
  });

  const config = useMemo(() => normalizeChatbotConfig(configRaw), [configRaw]);

  useEffect(() => {
    const profile = readProfile();
    setName(profile.name || user?.user_metadata?.full_name || "");
    setEmail(profile.email || user?.email || "");
    setPhone(profile.phone || user?.user_metadata?.phone || "");
    setSessionId(localStorage.getItem(STORAGE_SESSION));
  }, [user]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "bot",
          text: config.welcome_message,
        },
      ]);
    }
  }, [open, config.welcome_message, messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  const saveProfile = () => {
    const nextProfile = { name: name.trim(), email: email.trim(), phone: phone.trim() };
    localStorage.setItem(STORAGE_PROFILE, JSON.stringify(nextProfile));
    setProfileOpen(false);
  };

  const canUse = config.is_active && (config.allow_anonymous || !!user);
  const needsContact = config.require_contact && (!name.trim() || !phone.trim());

  const sendQuestion = async () => {
    const q = question.trim();
    if (!q || loading) return;

    if (needsContact) {
      setProfileOpen(true);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), sender: "system", text: "Please add your name and phone number so support can track your request." },
      ]);
      return;
    }

    saveProfile();
    setQuestion("");
    setLoading(true);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: "user", text: q }]);

    try {
      const answer = await askChatbot({
        question: q,
        customer: {
          name: name.trim() || user?.user_metadata?.full_name || undefined,
          email: email.trim() || user?.email || undefined,
          phone: phone.trim() || user?.user_metadata?.phone || undefined,
        },
        sessionId,
        sourceUrl: window.location.href,
      });

      if (answer.session_id) {
        setSessionId(answer.session_id);
        localStorage.setItem(STORAGE_SESSION, answer.session_id);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: answer.ok ? "bot" : "system",
          text: answer.ok ? (answer.answer || config.fallback_message) : (answer.error || config.fallback_message),
          payload: answer,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Chat support failed. Please try again.";
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: "system", text: message }]);
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
            "fixed bottom-20 z-40 h-12 w-12 rounded-full bg-primary p-0 text-primary-foreground shadow-lg transition-transform hover:scale-105",
            positionClass,
          )}
          onClick={() => setOpen(true)}
          aria-label="Open Chat Support"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      )}

      {open && (
        <Card className={cn("fixed bottom-20 z-50 flex h-[580px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden shadow-2xl", positionClass)}>
          <div className="flex items-center justify-between border-b bg-primary p-4 text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{config.support_name}</div>
                <div className="text-xs opacity-90">Product price • repair • exchange • support</div>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/15" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-b p-3">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs hover:bg-muted"
            >
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {name || phone ? `${name || "Customer"}${phone ? ` · ${phone}` : ""}` : "Add name, phone and email"}
              </span>
              {name && phone ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Badge variant="secondary">Needed</Badge>}
            </button>

            {profileOpen && (
              <div className="mt-3 grid gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email optional" type="email" />
                <Button size="sm" onClick={saveProfile}>Save Contact</Button>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={cn("flex", message.sender === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    message.sender === "user" ? "bg-primary text-primary-foreground" : message.sender === "system" ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-muted",
                  )}>
                    <p className="whitespace-pre-line">{message.text}</p>
                    {message.payload?.tracking_code && (
                      <div className="mt-2 rounded bg-background/60 px-2 py-1 text-xs">
                        Tracking: <span className="font-semibold">{message.payload.tracking_code}</span>
                      </div>
                    )}
                    {message.payload && <AnswerCards payload={message.payload} />}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-muted px-3 py-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void sendQuestion();
                }}
                placeholder="Ask: iPhone 15 price, exchange, repair..."
                disabled={loading}
              />
              <Button size="icon" onClick={() => void sendQuestion()} disabled={loading || !question.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <QuickAsk label="iPhone price" onClick={() => setQuestion("iPhone price")}/>
              <QuickAsk label="Exchange phone" onClick={() => setQuestion("Exchange phone")}/>
              <QuickAsk label="Repair support" onClick={() => setQuestion("Repair support")}/>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};

const QuickAsk = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="rounded-full border px-2 py-1 hover:bg-muted">
    {label}
  </button>
);

const AnswerCards = ({ payload }: { payload: ChatbotAnswer }) => {
  const products = payload.products || [];
  const prices = payload.official_prices || [];
  const offers = payload.store_offers || [];
  const stores = payload.stores || [];

  if (!products.length && !prices.length && !offers.length && !stores.length) return null;

  return (
    <div className="mt-3 space-y-2">
      {prices.slice(0, 3).map((item, index) => (
        <ResultCard key={`price-${index}`} icon={<IndianRupee className="h-3.5 w-3.5" />} title={String(item.title || "Official price")} href={String(item.href || "/mobile-price")}>
          <div>{formatMoney(item.price_text) || formatMoney(item.price_npr) || "Price on request"}</div>
          {item.verified ? <Badge variant="secondary" className="mt-1">Verified</Badge> : null}
        </ResultCard>
      ))}

      {products.slice(0, 3).map((item, index) => (
        <ResultCard key={`product-${index}`} icon={<ShoppingBag className="h-3.5 w-3.5" />} title={String(item.title || "Product")} href={String(item.href || "/products")}>
          <div>{formatMoney(item.price) || "Price on request"}</div>
          {item.description ? <div className="line-clamp-2 text-muted-foreground">{String(item.description)}</div> : null}
        </ResultCard>
      ))}

      {offers.slice(0, 3).map((item, index) => (
        <ResultCard key={`offer-${index}`} icon={<Store className="h-3.5 w-3.5" />} title={String(item.title || "Store offer")}>
          <div>{formatMoney(item.price_sale) || "Price on request"}</div>
          <div className="text-muted-foreground">{String(item.store_name || "Store")} {item.store_phone ? `· ${item.store_phone}` : ""}</div>
        </ResultCard>
      ))}

      {stores.slice(0, 3).map((item, index) => (
        <ResultCard key={`store-${index}`} icon={<Phone className="h-3.5 w-3.5" />} title={String(item.name || "Store")} href={String(item.href || "/stores")}>
          <div>{String(item.phone || "Contact from store page")}</div>
          {item.location ? <div className="text-muted-foreground">{String(item.location)}</div> : null}
        </ResultCard>
      ))}
    </div>
  );
};

const ResultCard = ({ icon, title, href, children }: { icon: React.ReactNode; title: string; href?: string; children: React.ReactNode }) => {
  const body = (
    <div className="rounded-lg border bg-background/75 p-2 text-xs text-foreground">
      <div className="mb-1 flex items-center gap-1.5 font-semibold">
        {icon}
        <span className="line-clamp-1">{title}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );

  if (!href) return body;
  return <Link to={href}>{body}</Link>;
};
