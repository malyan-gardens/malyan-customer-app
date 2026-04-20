import { supabase } from "./supabase";

export type ChatRole = "user" | "assistant";

export type ChatUiMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  recommendations?: AiRecommendation[];
  usage?: AiUsage;
};

export type AiRecommendation = {
  requested_name: string;
  reason: string;
  product_type: "natural" | "artificial" | "mixed";
  quantity: number;
  available: boolean;
  matched_product: ProductLike | null;
  alternative_product: ProductLike | null;
};

export type ProductLike = {
  id: string;
  name_ar: string | null;
  description: string | null;
  selling_price: number | null;
  currency: string | null;
  image_url: string | null;
  category: string | null;
  quantity: number | null;
};

export type AiUsage = {
  model: string;
  request_cost_usd: number;
  daily_cost_usd: number;
  daily_message_count: number;
  remaining_messages: number;
  remaining_budget_usd: number;
  budget_limit_usd: number;
};

export type InvokeAiPayload = {
  message: string;
  userId?: string;
  conversationId?: string;
  history?: Array<{ role: ChatRole; content: string; created_at?: string }>;
  mode?: "chat" | "design" | "doctor";
  preferences?: Record<string, unknown>;
  image?: {
    base64?: string;
    mediaType?: string;
    imageUrl?: string;
  };
};

export type InvokeAiResult = {
  conversationId: string;
  reply: string;
  recommendations: AiRecommendation[];
  diagnosis: string;
  layoutSuggestion: string;
  maintenancePlan: string[];
  requestedProducts: Array<{ product_name: string; description?: string }>;
  estimatedProductsCostQar: number;
  usage: AiUsage | null;
};

type InventoryAiRow = {
  name_ar: string | null;
  selling_price: number | null;
  currency: string | null;
  quantity: number | null;
  category: string | null;
};

type PromotionAiRow = {
  title: string | null;
  type: string | null;
  discount_value: number | null;
  applies_to: string | null;
  target_category: string | null;
};

function promotionTypeLabelAr(type: string | null | undefined): string {
  const t = String(type ?? "").toLowerCase().trim();
  const map: Record<string, string> = {
    percentage: "نسبة مئوية",
    flash: "عرض سريع",
    buy2get1: "اشترِ 2 واحصل على 1",
    buy3pay2: "اشترِ 3 وادفع 2",
    min_order: "حد أدنى للطلب",
    product_specific: "منتج محدد",
  };
  return map[t] || (t ? t : "عرض");
}

function detectPreferredLanguage(text: string): "ar" | "en" {
  const t = text.trim();
  if (!t) return "ar";
  let arabic = 0;
  let latin = 0;
  for (const ch of t.slice(0, 200)) {
    if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(ch)) arabic += 1;
    if (/[a-zA-Z]/.test(ch)) latin += 1;
  }
  return arabic >= latin ? "ar" : "en";
}

async function fetchInventoryContextString(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("inventory")
      .select("id,name_ar,selling_price,currency,quantity,category,description")
      .gt("quantity", 0)
      .order("name_ar", { ascending: true })
      .limit(50);
    if (error || !data?.length) return "";
    const lines = (data as InventoryAiRow[]).map((row) => {
      const name = row.name_ar?.trim() || "—";
      const price = row.selling_price ?? 0;
      const cur = row.currency?.trim() || "QAR";
      const qty = row.quantity ?? 0;
      const cat = row.category?.trim() || "—";
      return `${name} | ${price} ${cur} | الكمية: ${qty} | التصنيف: ${cat}`;
    });
    return `المخزون المتاح حالياً:\n\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

async function fetchPromotionsContextString(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("promotions")
      .select("title,type,discount_value,applies_to,target_category")
      .eq("is_active", true);
    if (error || !data?.length) return "";
    const lines = (data as PromotionAiRow[]).map((row) => {
      const title = row.title?.trim() || "عرض";
      const typeLabel = promotionTypeLabelAr(row.type);
      const dv = row.discount_value ?? 0;
      return `${title} | نوع: ${typeLabel} | خصم: ${dv}%`;
    });
    return `العروض الحالية:\n\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

type CustomerProfileSnippet = {
  message_count: number;
  last_topic: string | null;
};

async function fetchCustomerProfileForPrompt(
  userId: string | undefined
): Promise<CustomerProfileSnippet | null> {
  if (!userId?.trim()) return null;
  try {
    const { data, error } = await supabase
      .from("ai_customer_profiles")
      .select("message_count,last_topic,preferred_language")
      .eq("user_id", userId.trim())
      .maybeSingle();
    if (error || !data) return null;
    return {
      message_count: Number(data.message_count ?? 0),
      last_topic:
        data.last_topic != null && String(data.last_topic).length > 0
          ? String(data.last_topic)
          : null,
    };
  } catch {
    return null;
  }
}

function buildCustomerProfilePromptBlock(profile: CustomerProfileSnippet): string {
  const topic = profile.last_topic?.trim() || "—";
  return `عدد محادثاته السابقة: ${profile.message_count}\nآخر موضوع: ${topic}`;
}

async function recordCustomerTurn(payload: InvokeAiPayload): Promise<void> {
  const userId = payload.userId?.trim();
  if (!userId) return;
  const userText =
    typeof payload.message === "string" && payload.message.trim().length > 0
      ? payload.message.trim()
      : "[صورة]";
  const lastTopic = userText.slice(0, 100);
  const preferredLanguage = detectPreferredLanguage(userText);
  try {
    const { data: existing } = await supabase
      .from("ai_customer_profiles")
      .select("message_count")
      .eq("user_id", userId)
      .maybeSingle();
    const nextCount = (existing?.message_count != null ? Number(existing.message_count) : 0) + 1;
    const { error } = await supabase.from("ai_customer_profiles").upsert(
      {
        user_id: userId,
        last_seen: new Date().toISOString(),
        message_count: nextCount,
        last_topic: lastTopic,
        preferred_language: preferredLanguage,
      },
      { onConflict: "user_id" }
    );
    if (error) {
      // Table missing or RLS: do not fail the chat
    }
  } catch {
    /* ignore */
  }
}

export async function invokeMalyanAi(payload: InvokeAiPayload): Promise<InvokeAiResult> {
  const SYSTEM_PROMPT = `أنت مليان الذكي، مستشار متخصص في النباتات والحدائق لشركة مليان للحدائق في قطر.
تتحدث فقط عن: النباتات، تصميم الحدائق، الصيانة، منتجات مليان.
إذا سُئلت عن أي موضوع آخر قل: "أنا متخصص في عالم النباتات والحدائق فقط!"
دائماً رد بنفس لغة المستخدم.`;

  const [inventoryContext, promotionsContext, customerProfile] = await Promise.all([
    fetchInventoryContextString(),
    fetchPromotionsContextString(),
    fetchCustomerProfileForPrompt(payload.userId),
  ]);

  let systemPrompt = SYSTEM_PROMPT;
  if (inventoryContext) {
    systemPrompt += `\n\n--- بيانات المخزون ---\n${inventoryContext}`;
  }
  if (promotionsContext) {
    systemPrompt += `\n\n--- العروض النشطة ---\n${promotionsContext}`;
  }
  if (customerProfile) {
    systemPrompt += `\n\n--- ملف العميل ---\n${buildCustomerProfilePromptBlock(customerProfile)}`;
  }

  // Prefer a multimodal model when we have an image.
  const model = payload.image?.base64 ? "claude-sonnet-4-6" : "claude-haiku-4-5";

  const history = payload.history?.length
    ? payload.history.map((h) => ({
        role: h.role,
        content: h.content,
      }))
    : [];

  const imageBase64 = payload.image?.base64;
  const userContent = imageBase64
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: payload.image?.mediaType ?? "image/jpeg",
            data: imageBase64,
          },
        },
        { type: "text", text: payload.message },
      ]
    : payload.message;

  const messages =
    history.length > 0
      ? [...history, { role: "user", content: userContent }]
      : [{ role: "user", content: userContent }];

  // On web we can call the same-origin proxy. On native, use the Vercel domain.
  const proxyUrl =
    typeof window !== "undefined"
      ? "/api/anthropic-proxy"
      : "https://malyan-customer-app.vercel.app/api/anthropic-proxy";

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });

  const data = await response.json();
  const reply: string =
    data?.content?.[0]?.text ??
    data?.error?.message ??
    "عذراً، حدث خطأ.";

  if (!response.ok) {
    throw new Error(reply);
  }

  await recordCustomerTurn(payload);

  return {
    conversationId: payload.conversationId ?? "",
    reply,
    recommendations: [],
    diagnosis: "",
    layoutSuggestion: "",
    maintenancePlan: [],
    requestedProducts: [],
    estimatedProductsCostQar: 0,
    usage: null,
  };
}

export async function getLatestConversation(
  mode: "chat" | "design" | "doctor" = "chat"
): Promise<{
  id: string;
  messages: ChatUiMessage[];
} | null> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id,messages")
    .eq("conversation_type", mode)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const messages = Array.isArray(data.messages) ? data.messages : [];
  return {
    id: String(data.id),
    messages: messages.map((m: Record<string, unknown>, idx: number) => ({
      id: String(m.id ?? `${idx}-${m.created_at ?? ""}`),
      role: (m.role === "assistant" ? "assistant" : "user") as ChatRole,
      content: String(m.content ?? ""),
      createdAt: String(m.created_at ?? new Date().toISOString()),
      recommendations: Array.isArray(m.recommendations)
        ? (m.recommendations as AiRecommendation[])
        : undefined,
    })),
  };
}

export async function getTodayAiUsage(): Promise<AiUsage | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("ai_daily_usage")
    .select("message_count,cost_usd")
    .eq("date", today)
    .maybeSingle();
  if (!data) return null;
  const messageCount = Number(data.message_count ?? 0);
  const dailyCost = Number(data.cost_usd ?? 0);
  return {
    model: "claude-haiku-3-5-20251001",
    request_cost_usd: 0,
    daily_cost_usd: dailyCost,
    daily_message_count: messageCount,
    remaining_messages: Math.max(0, 20 - messageCount),
    remaining_budget_usd: Math.max(0, 0.1 - dailyCost),
    budget_limit_usd: 0.1,
  };
}

export async function requestUnavailableProduct(
  productName: string,
  description: string
): Promise<void> {
  const { error } = await supabase.from("ai_product_requests").insert({
    product_name: productName,
    description,
  });
  if (error) throw new Error(error.message);
}

export async function saveAiDesign(
  title: string,
  preferences: Record<string, unknown>,
  proposal: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("ai_saved_designs").insert({
    title,
    preferences,
    proposal,
  });
  if (error) throw new Error(error.message);
}

export async function listAiDesigns(): Promise<
  Array<{
    id: string;
    title: string;
    preferences: Record<string, unknown>;
    proposal: Record<string, unknown>;
    created_at: string;
  }>
> {
  const { data, error } = await supabase
    .from("ai_saved_designs")
    .select("id,title,preferences,proposal,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    id: string;
    title: string;
    preferences: Record<string, unknown>;
    proposal: Record<string, unknown>;
    created_at: string;
  }>;
}
