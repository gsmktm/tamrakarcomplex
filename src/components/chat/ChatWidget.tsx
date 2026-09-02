import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { askChatbot, fetchPublicChatbotConfig, normalizeChatbotConfig, type ChatbotAnswer } from "@/lib/chatbot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, CheckCircle2, ShoppingBag, IndianRupee, ChevronDown, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface ChatWidgetProps {
  settings?: { position?: "bottom-right" | "bottom-left" };
}

type UiMessage = {
  id: string;
  sender: "user" | "bot" | "system";
  text: string;
  payload?: ChatbotAnswer;
  ts: number;
};

const STORAGE_PROFILE = "tamrakar-chat-profile";
const STORAGE_SESSION = "tamrakar-chat-session-id";

const QUICK_CHIPS = [
  { label: "📱 Buy Phone", q: "mobile phone price list" },
  { label: "💱 Exchange Phone", q: "exchange my old phone" },
  { label: "🔧 Repair Phone", q: "phone repair service" },
  { label: "🍎 iPhone Price", q: "iPhone price in Nepal" },
  { label: "📺 Samsung Price", q: "Samsung phone price" },
  { label: "💻 Laptop Price", q: "laptop price" },
  { label: "🖥️ Mac Repair", q: "MacBook repair" },
  { label: "🔓 Unlock Help", q: "mobile SIM unlock" },
  { label: "💰 Sell Phone", q: "sell my used phone" },
  { label: "💳 EMI Options", q: "EMI installment" },
  { label: "🛡️ Warranty", q: "warranty inquiry" },
  { label: "📍 Location", q: "Tamrakar Complex location New Road" },
  { label: "🔋 Used Phones", q: "refurbished used phones" },
  { label: "🎧 Accessories", q: "accessories charger cover" },
];

const formatMoney = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return `Rs. ${value.toLocaleString("en-IN")}`;
  return String(value);
};

const readProfile = () => {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE);
    return raw ? (JSON.parse(raw) as { name?: string; email?: string }) : {};
  } catch {
    return {};
  }
};

const TypingDots = () => (
  <div className="flex items-center gap-1 px-1 py-0.5">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
        style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
      />
    ))}
  </div>
);

export const ChatWidget = ({ settings: propSettings = {} }: ChatWidgetProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const positionClass = propSettings.position === "bottom-left" ? "left-4" : "right-4";

  // Hide chatbot on admin routes
  const isAdminRoute = location.pathname.startsWith("/suadmin") ||
    location.pathname.startsWith("/staffadmin") ||
    location.pathname.startsWith("/storeadmin");

  const { data: configRaw } = useQuery({
    queryKey: ["chatbot_config_public_complete"],
    queryFn: fetchPublicChatbotConfig,
    staleTime: 1000 * 60 * 5,
  });

  const config = useMemo(() => normalizeChatbotConfig(configRaw), [configRaw]);

  useEffect(() => {
    const profile = readProfile();
    setName(profile.name || user?.user_metadata?.full_name || "");
    setEmail(profile.email || user?.email || "");
    setSessionId(localStorage.getItem(STORAGE_SESSION));
  }, [user]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: "welcome",
        sender: "bot",
        text: config.welcome_message,
        ts: Date.now(),
      }]);
      setUnread(0);
    }
  }, [open, config.welcome_message, messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    if (open) inputRef.current?.focus();
  }, [messages, loading, open]);

  const saveProfile = () => {
    const next = { name: name.trim(), email: email.trim() };
    localStorage.setItem(STORAGE_PROFILE, JSON.stringify(next));
    setShowProfile(false);
  };

  const canUse = config.is_active && (config.allow_anonymous || !!user);
  const sendQuestion = async (override?: string) => {
    const q = (override || question).trim();
    if (!q || loading) return;

    saveProfile();
    setQuestion("");
    setLoading(true);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: "user", text: q, ts: Date.now() }]);

    try {
      const answer = await askChatbot({
        question: q,
        customer: {
          name: name.trim() || user?.user_metadata?.full_name || undefined,
          email: email.trim() || user?.email || undefined,
        },
        sessionId,
        sourceUrl: window.location.href,
      });

      if (answer.session_id) {
        setSessionId(answer.session_id);
        localStorage.setItem(STORAGE_SESSION, answer.session_id);
      }

      const botMsg: UiMessage = {
        id: crypto.randomUUID(),
        sender: answer.ok ? "bot" : "system",
        text: answer.ok ? (answer.answer || config.fallback_message) : (answer.error || config.fallback_message),
        payload: answer,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
      if (!open) setUnread((u) => u + 1);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Chat failed. Please try again.";
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: "system", text: msg, ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  if (!canUse || isAdminRoute) return null;

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          type="button"
          onClick={() => { setOpen(true); setUnread(0); }}
          aria-label="Open Chat"
          className={cn(
            "fixed bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 hover:scale-110 active:scale-95",
            "bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 text-white",
            positionClass,
          )}
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 animate-ping rounded-full bg-violet-500 opacity-20" />
          <Bot className="relative h-6 w-6" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className={cn(
            "fixed bottom-20 z-50 flex flex-col overflow-hidden rounded-2xl shadow-2xl",
            "w-[370px] max-w-[calc(100vw-1.5rem)]",
            "border border-white/10 bg-background",
            positionClass,
          )}
          style={{ height: "clamp(480px, 80vh, 600px)" }}
        >
          {/* Header */}
          <div className="relative flex items-center justify-between gap-3 bg-gradient-to-r from-violet-700 via-purple-700 to-blue-700 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30">
                <Sparkles className="h-5 w-5" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-violet-700" />
              </div>
              <div>
                <p className="font-semibold leading-tight">{config.support_name}</p>
                <p className="text-[11px] text-white/75">Mobile • Repair • Exchange • Price</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Close chat"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Profile strip */}
          <div className="border-b px-3 py-2">
            <button
              type="button"
              onClick={() => setShowProfile((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-1.5 text-xs hover:bg-muted transition-colors"
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                {name || email ? `${name || "You"}${email ? ` · ${email}` : ""}` : "Add name or email (optional)"}
              </span>
              {name || email ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <Badge variant="secondary" className="text-[10px]">Optional</Badge>
              )}
            </button>

            {showProfile && (
              <div className="mt-2 space-y-1.5">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-8 text-xs" />
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" type="email" className="h-8 text-xs" />
                <Button size="sm" onClick={saveProfile} className="h-7 w-full text-xs">Save</Button>
              </div>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-3 py-3">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex items-end gap-2", msg.sender === "user" ? "flex-row-reverse" : "flex-row")}>
                  {msg.sender !== "user" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    msg.sender === "user"
                      ? "rounded-br-sm bg-gradient-to-br from-violet-600 to-blue-600 text-white"
                      : msg.sender === "system"
                        ? "rounded-bl-sm border border-amber-200 bg-amber-50 text-amber-900"
                        : "rounded-bl-sm border bg-card text-foreground",
                  )}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                    {msg.payload?.tracking_code && (
                      <div className="mt-1.5 rounded bg-black/10 px-2 py-1 text-xs font-mono">
                        #{msg.payload.tracking_code}
                      </div>
                    )}
                    {msg.payload && <AnswerCards payload={msg.payload} />}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-end gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm border bg-card px-3 py-2">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          {/* Quick chips */}
          <div className="border-t px-3 pt-2 pb-1">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip.q}
                  type="button"
                  onClick={() => sendQuestion(chip.q)}
                  disabled={loading}
                  className="shrink-0 rounded-full border bg-muted/60 px-2.5 py-1 text-[11px] font-medium transition-colors hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="border-t px-3 pb-3 pt-2">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void sendQuestion(); }}
                placeholder="Ask price, repair, exchange…"
                disabled={loading}
                className="flex-1 rounded-xl border-muted bg-muted/40 text-sm placeholder:text-muted-foreground/60 focus-visible:border-violet-400 focus-visible:ring-violet-400/20"
              />
              <Button
                size="icon"
                onClick={() => void sendQuestion()}
                disabled={loading || !question.trim()}
                className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white hover:from-violet-700 hover:to-blue-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              Tamrakar Complex · New Road, Kathmandu
            </p>
          </div>
        </div>
      )}
    </>
  );
};

const AnswerCards = ({ payload }: { payload: ChatbotAnswer }) => {
  const products = payload.products || [];
  const prices = payload.official_prices || [];
  const offers = payload.store_offers || [];
  if (!products.length && !prices.length && !offers.length) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {prices.slice(0, 3).map((item, i) => (
        <ResultCard key={`p-${i}`} icon={<IndianRupee className="h-3 w-3" />} title={String(item.title || "Official price")} href={String(item.href || "/cat/mobiles")}>
          <span>{formatMoney(item.price_text) || formatMoney(item.price_npr) || "Price on request"}</span>
          {item.verified ? <Badge variant="secondary" className="ml-1 text-[10px]">✓ Verified</Badge> : null}
        </ResultCard>
      ))}
      {products.slice(0, 3).map((item, i) => (
        <ResultCard key={`pd-${i}`} icon={<ShoppingBag className="h-3 w-3" />} title={String(item.title || "Product")} href={String(item.href || "/products")}>
          <span>{formatMoney(item.price) || "Price on request"}</span>
        </ResultCard>
      ))}
      {offers.slice(0, 3).map((item, i) => (
        <ResultCard key={`o-${i}`} icon={<ShoppingBag className="h-3 w-3" />} title={String(item.title || "Available offer")}>
          <span>{formatMoney(item.price_sale) || "Price on request"}</span>
        </ResultCard>
      ))}
    </div>
  );
};

const ResultCard = ({ icon, title, href, children }: { icon: React.ReactNode; title: string; href?: string; children: React.ReactNode }) => {
  const body = (
    <div className="mt-1 rounded-xl border bg-background/80 px-2.5 py-1.5 text-xs text-foreground backdrop-blur-sm">
      <div className="flex items-center gap-1 font-semibold">
        {icon}
        <span className="line-clamp-1">{title}</span>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-muted-foreground">{children}</div>
    </div>
  );
  if (!href) return body;
  return <Link to={href}>{body}</Link>;
};
