import { supabase } from "@/integrations/supabase/client";

export type ChatbotSources = {
  products: boolean;
  articles: boolean;
  guides: boolean;
  content_pages: boolean;
  device_catalog: boolean;
  official_prices: boolean;
  store_offers: boolean;
  training: boolean;
};

export type ChatbotConfig = {
  id?: string;
  welcome_message: string;
  is_active: boolean;
  support_name: string;
  allow_anonymous: boolean;
  require_contact: boolean;
  auto_create_customer: boolean;
  show_store_contacts: boolean;
  sources_enabled: ChatbotSources;
  fallback_message: string;
  training_prompt: string;
  business_info: {
    phone?: string;
    email?: string;
    location?: string;
    hours?: string;
    [key: string]: unknown;
  };
  updated_at?: string;
};

export type ChatCustomerPayload = {
  name?: string;
  email?: string;
  phone?: string;
};

export type ChatbotAnswer = {
  ok: boolean;
  error?: string;
  session_id?: string;
  customer_id?: string;
  tracking_code?: string;
  intent?: string;
  answer?: string;
  training?: Array<Record<string, unknown>>;
  products?: Array<Record<string, unknown>>;
  official_prices?: Array<Record<string, unknown>>;
  store_offers?: Array<Record<string, unknown>>;
  stores?: Array<Record<string, unknown>>;
};

export type ChatbotTrainingItem = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  keywords: string[] | null;
  priority: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at?: string;
};

export const defaultChatbotSources: ChatbotSources = {
  products: true,
  articles: true,
  guides: true,
  content_pages: true,
  device_catalog: true,
  official_prices: true,
  store_offers: true,
  training: true,
};

export const defaultChatbotConfig: ChatbotConfig = {
  welcome_message: "Namaste! Ask me about mobile price, product availability, exchange, repair, store contact or order support.",
  is_active: true,
  support_name: "Tamrakar Support",
  allow_anonymous: true,
  require_contact: true,
  auto_create_customer: true,
  show_store_contacts: true,
  sources_enabled: defaultChatbotSources,
  fallback_message: "I could not find an exact answer. Please share your phone number and our support team will contact you.",
  training_prompt: "Answer customer questions using TamrakarComplex.com product, price, store, repair, exchange and official content data. Keep answers short, helpful and truthful. If the answer is not available, collect customer contact and create a support request.",
  business_info: {
    phone: "+9779851091542",
    email: "support@tamrakarcomplex.com",
    location: "Tamrakar Complex, New Road, Kathmandu",
    hours: "10 AM - 7 PM",
  },
};

export const normalizeChatbotConfig = (raw: Partial<ChatbotConfig> | null | undefined): ChatbotConfig => ({
  ...defaultChatbotConfig,
  ...(raw || {}),
  sources_enabled: {
    ...defaultChatbotSources,
    ...((raw?.sources_enabled as Partial<ChatbotSources> | undefined) || {}),
  },
  business_info: {
    ...defaultChatbotConfig.business_info,
    ...((raw?.business_info as ChatbotConfig["business_info"] | undefined) || {}),
  },
});

export async function fetchPublicChatbotConfig(): Promise<ChatbotConfig> {
  const { data, error } = await supabase
    .from("chatbot_config")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return normalizeChatbotConfig(data as Partial<ChatbotConfig> | null);
}

export async function saveChatbotConfig(config: ChatbotConfig): Promise<void> {
  const payload = {
    welcome_message: config.welcome_message,
    is_active: config.is_active,
    support_name: config.support_name,
    allow_anonymous: config.allow_anonymous,
    require_contact: config.require_contact,
    auto_create_customer: config.auto_create_customer,
    show_store_contacts: config.show_store_contacts,
    sources_enabled: config.sources_enabled,
    fallback_message: config.fallback_message,
    training_prompt: config.training_prompt,
    business_info: config.business_info,
    updated_at: new Date().toISOString(),
  };

  if (config.id) {
    const { error } = await supabase.from("chatbot_config").update(payload).eq("id", config.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("chatbot_config").insert(payload);
  if (error) throw error;
}

export async function askChatbot(params: {
  question: string;
  customer: ChatCustomerPayload;
  sessionId?: string | null;
  sourceUrl?: string;
}): Promise<ChatbotAnswer> {
  const { data, error } = await supabase.rpc("chatbot_answer", {
    p_question: params.question,
    p_customer: params.customer,
    p_session_id: params.sessionId || null,
    p_source_url: params.sourceUrl || window.location.pathname,
  });

  if (error) {
    if (error.code === "PGRST202" || String(error.message || "").includes("Could not find the function public.chatbot_answer")) {
      return askChatbotFromPublicTables(params);
    }
    throw error;
  }
  return data as ChatbotAnswer;
}

async function askChatbotFromPublicTables(params: {
  question: string;
  customer: ChatCustomerPayload;
  sourceUrl?: string;
}): Promise<ChatbotAnswer> {
  const query = params.question.trim();
  const like = `%${query}%`;
  const sessionId = `local-${Date.now()}`;
  const trackingCode = `LOCAL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const [products, articles, guides, pages, devices, stores] = await Promise.all([
    safeSelect("products", "id,name,slug,brand,price,price_value,description,in_stock", (q) =>
      q.or(`name.ilike.${like},brand.ilike.${like},description.ilike.${like}`).limit(5),
    ),
    safeSelect("articles", "id,title,slug,excerpt", (q) => q.ilike("title", like).limit(3)),
    safeSelect("guides", "id,title,slug,excerpt", (q) => q.ilike("title", like).limit(3)),
    safeSelect("content_pages", "id,title,slug,content", (q) => q.ilike("title", like).limit(3)),
    safeSelect("device_catalog", "id,brand,model,canonical_slug", (q) => q.ilike("model", like).limit(5)),
    safeSelect("stores", "id,name,phone,location", (q) => q.limit(3)),
  ]);

  const productCards = products.map((item) => ({
    ...item,
    title: item.name,
    href: item.slug ? `/product/${item.slug}` : "/products",
  }));

  const officialPrices = devices.map((item) => ({
    ...item,
    title: `${item.brand || ""} ${item.model || ""}`.trim(),
    href: "/mobile-price",
    price_text: "Open price list for latest official price",
  }));

  const storeCards = stores.map((item) => ({
    ...item,
    href: "/stores",
  }));

  const answer = buildFallbackAnswer({
    query,
    products: productCards,
    articles,
    guides,
    pages,
    devices: officialPrices,
    stores: storeCards,
  });

  await supabase.from("contact_messages").insert({
    name: params.customer.name || "Chat Customer",
    email: params.customer.email || "chatbot@tamrakarcomplex.com",
    subject: "chatbot: fallback",
    message: JSON.stringify({
      question: query,
      phone: params.customer.phone || null,
      source_url: params.sourceUrl || null,
      tracking_code: trackingCode,
      note: "Fallback used because chatbot_answer RPC is not installed.",
    }),
  });

  return {
    ok: true,
    session_id: sessionId,
    tracking_code: trackingCode,
    intent: detectIntent(query),
    answer,
    products: productCards,
    official_prices: officialPrices,
    stores: storeCards,
  };
}

async function safeSelect(table: string, columns: string, apply: (query: any) => any): Promise<Array<Record<string, any>>> {
  try {
    const { data, error } = await apply(supabase.from(table).select(columns));
    if (error) return [];
    return (data || []) as Array<Record<string, any>>;
  } catch {
    return [];
  }
}

function detectIntent(question: string) {
  const normalized = question.toLowerCase();
  if (/(price|cost|rate|rs|मूल्य|कति)/.test(normalized)) return "price";
  if (/(repair|screen|battery|unlock|मर्मत)/.test(normalized)) return "repair";
  if (/(exchange|sell|trade|बेच|साट)/.test(normalized)) return "exchange";
  if (/(store|shop|contact|phone|location|पसल)/.test(normalized)) return "store_contact";
  return "general";
}

function buildFallbackAnswer(result: {
  query: string;
  products: Array<Record<string, any>>;
  articles: Array<Record<string, any>>;
  guides: Array<Record<string, any>>;
  pages: Array<Record<string, any>>;
  devices: Array<Record<string, any>>;
  stores: Array<Record<string, any>>;
}) {
  if (result.products.length) return "Product भेटियो। तल price, detail र link छ।";
  if (result.devices.length) return "Model भेटियो। तल price list link छ।";
  if (result.articles.length || result.guides.length || result.pages.length) return "Related information भेटियो। कृपया तलको result हेर्नुहोस्।";
  if (detectIntent(result.query) === "store_contact" && result.stores.length) return "Tamrakar Complex का केही store contact तल छन्।";
  if (detectIntent(result.query) === "exchange") return "For phone exchange, please share brand, model, storage, battery health, condition, warranty and accessories. Our team will confirm the final value.";
  if (detectIntent(result.query) === "repair") return "For repair, please share device brand/model and problem such as screen, battery, charging, software, unlock or water damage.";
  return "I could not find an exact answer from the installed public data. Please share your phone number and our support team will contact you.";
}

export async function fetchChatbotOverview() {
  const { data, error } = await supabase.rpc("get_chatbot_admin_overview");
  if (error) throw error;
  return data as {
    total_customers: number;
    open_sessions: number;
    answered_sessions: number;
    training_items: number;
    today_messages: number;
    latest_sessions: Array<Record<string, unknown>>;
  };
}

export async function fetchTrainingItems(): Promise<ChatbotTrainingItem[]> {
  const { data, error } = await supabase
    .from("chatbot_training_items")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as ChatbotTrainingItem[];
}

export async function upsertTrainingItem(item: Partial<ChatbotTrainingItem> & { question: string; answer: string }): Promise<void> {
  const payload = {
    question: item.question.trim(),
    answer: item.answer.trim(),
    category: item.category || "general",
    keywords: item.keywords || [],
    priority: item.priority ?? 100,
    is_active: item.is_active ?? true,
    updated_at: new Date().toISOString(),
  };

  if (item.id) {
    const { error } = await supabase.from("chatbot_training_items").update(payload).eq("id", item.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("chatbot_training_items").insert(payload);
  if (error) throw error;
}

export async function deleteTrainingItem(id: string): Promise<void> {
  const { error } = await supabase.from("chatbot_training_items").delete().eq("id", id);
  if (error) throw error;
}
